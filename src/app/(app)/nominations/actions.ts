"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type NominationActionState = { error?: string; ok?: boolean };

async function getSignedInUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user } = await getSignedInUser();
  if (!user) return { supabase, user: null, isAdmin: false };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return { supabase, user, isAdmin: profile?.role === "admin" };
}

const nominationSchema = z.object({
  cycleId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(200),
  coverUrl: z.union([z.literal(""), z.string().url()]).optional(),
  description: z.string().max(5000).optional(),
  googleBooksId: z.string().max(100).optional(),
  pitchNote: z.string().trim().max(1000).optional(),
});

export async function createNomination(
  _: NominationActionState,
  formData: FormData,
): Promise<NominationActionState> {
  const parsed = nominationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { supabase, user } = await getSignedInUser();
  if (!user) return { error: "Sign in to nominate a book." };
  const { cycleId, title, author, coverUrl, description, googleBooksId, pitchNote } = parsed.data;

  const { data: cycle } = await supabase
    .from("nomination_cycles")
    .select("id")
    .eq("id", cycleId)
    .eq("status", "open")
    .maybeSingle();
  if (!cycle) return { error: "This nomination cycle is closed." };

  let bookId: string | null = null;
  if (googleBooksId) {
    const { data: existingGoogleBook } = await supabase
      .from("books")
      .select("id")
      .eq("google_books_id", googleBooksId)
      .maybeSingle();
    bookId = existingGoogleBook?.id ?? null;
  }
  if (!bookId) {
    const { data: existingBook } = await supabase
      .from("books")
      .select("id")
      .ilike("title", title)
      .ilike("author", author)
      .limit(1)
      .maybeSingle();
    bookId = existingBook?.id ?? null;
  }
  if (!bookId) {
    const { data: book, error: bookError } = await supabase
      .from("books")
      .insert({
        title,
        author,
        cover_url: coverUrl || null,
        description: description || null,
        google_books_id: googleBooksId || null,
        total_chapters: 1,
        status: "upcoming",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (bookError || !book) return { error: bookError?.message ?? "Could not save this book." };
    bookId = book.id;
  }

  const { error } = await supabase.from("nominations").insert({
    user_id: user.id,
    book_id: bookId,
    cycle_id: cycleId,
    title,
    author,
    pitch_note: pitchNote || null,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") return { error: "That book has already been nominated in this cycle." };
    return { error: error.message };
  }

  revalidatePath("/nominations");
  revalidatePath("/library");
  return { ok: true };
}

const editNominationSchema = z.object({
  nominationId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(200),
  pitchNote: z.string().trim().max(1000),
});

export async function editNomination(
  _: NominationActionState,
  formData: FormData,
): Promise<NominationActionState> {
  const parsed = editNominationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, user } = await getSignedInUser();
  if (!user) return { error: "Sign in to edit a nomination." };

  const { error } = await supabase.rpc("edit_nomination", {
    p_nomination: parsed.data.nominationId,
    p_title: parsed.data.title,
    p_author: parsed.data.author,
    p_pitch_note: parsed.data.pitchNote || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/nominations");
  return { ok: true };
}

export async function deleteNomination(
  _: NominationActionState,
  formData: FormData,
): Promise<NominationActionState> {
  const nominationId = z.string().uuid().safeParse(formData.get("nominationId"));
  if (!nominationId.success) return { error: "Invalid nomination." };
  const { supabase, user } = await getSignedInUser();
  if (!user) return { error: "Sign in to delete a nomination." };

  const { error } = await supabase.rpc("delete_nomination", { p_nomination: nominationId.data });
  if (error) return { error: error.message };
  revalidatePath("/nominations");
  revalidatePath("/library");
  return { ok: true };
}

const cycleSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export async function createCycle(
  _: NominationActionState,
  formData: FormData,
): Promise<NominationActionState> {
  const parsed = cycleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Only admins can open a nomination cycle." };

  const { error } = await supabase.from("nomination_cycles").insert({ name: parsed.data.name });
  if (error) {
    if (error.code === "23505") return { error: "A cycle with that name already exists." };
    return { error: error.message };
  }
  revalidatePath("/nominations");
  return { ok: true };
}

export async function castVote(
  _: NominationActionState,
  formData: FormData,
): Promise<NominationActionState> {
  const nominationId = z.string().uuid().safeParse(formData.get("nominationId"));
  if (!nominationId.success) return { error: "Invalid nomination." };
  const { supabase, user } = await getSignedInUser();
  if (!user) return { error: "Sign in to vote." };

  const { error } = await supabase.rpc("cast_nomination_vote", {
    p_nomination_id: nominationId.data,
  });
  if (error) return { error: error.message };
  revalidatePath("/nominations");
  return { ok: true };
}

const finalizeSchema = z.object({
  cycleId: z.string().uuid(),
  nominationId: z.string().uuid(),
});

export async function finalizeCycle(
  _: NominationActionState,
  formData: FormData,
): Promise<NominationActionState> {
  const parsed = finalizeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid cycle or nomination." };
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Only admins can finalize a nomination cycle." };

  const { error } = await supabase.rpc("finalize_nomination_cycle", {
    p_cycle_id: parsed.data.cycleId,
    p_nomination_id: parsed.data.nominationId,
  });
  if (error) return { error: error.message };
  revalidatePath("/nominations");
  revalidatePath("/dashboard");
  revalidatePath("/book");
  revalidatePath("/discussions");
  revalidatePath("/admin/books");
  return { ok: true };
}

export async function closeCycle(
  _: NominationActionState,
  formData: FormData,
): Promise<NominationActionState> {
  const cycleId = z.string().uuid().safeParse(formData.get("cycleId"));
  if (!cycleId.success) return { error: "Invalid cycle." };
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Only admins can close a nomination cycle." };

  const { error } = await supabase
    .from("nomination_cycles")
    .update({ status: "closed", closes_at: new Date().toISOString() })
    .eq("id", cycleId.data)
    .eq("status", "open");
  if (error) return { error: error.message };
  revalidatePath("/nominations");
  return { ok: true };
}
