"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: boolean };

const progressSchema = z.object({
  bookId: z.string().uuid(),
  chapter: z.coerce.number().int().min(0),
});

export async function updateProgress(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = progressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid chapter." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: book } = await supabase
    .from("books")
    .select("total_chapters")
    .eq("id", parsed.data.bookId)
    .single();
  if (!book) return { error: "Book not found." };

  const chapter = Math.min(parsed.data.chapter, book.total_chapters);
  const done = chapter >= book.total_chapters;

  const { error } = await supabase.from("user_books").upsert(
    {
      user_id: user.id,
      book_id: parsed.data.bookId,
      current_chapter: chapter,
      status: done ? "completed" : "reading",
      finished_at: done ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,book_id" }
  );
  if (error) return { error: error.message };

  revalidatePath("/book");
  revalidatePath("/dashboard");
  return { ok: true };
}

const thoughtSchema = z.object({
  bookId: z.string().uuid(),
  chapter: z.coerce.number().int().min(1),
  content: z.string().trim().min(1, "Write something first.").max(2000),
  sentiment: z.enum(["loved", "liked", "confused", "shocked", "bored", "theory"]).optional(),
});

export async function postThought(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  if (!raw.sentiment) delete raw.sentiment;
  const parsed = thoughtSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: ub } = await supabase
    .from("user_books")
    .select("current_chapter, status")
    .eq("user_id", user.id)
    .eq("book_id", parsed.data.bookId)
    .maybeSingle();
  const reached = ub?.status === "completed" || (ub?.current_chapter ?? 0) >= parsed.data.chapter;
  if (!reached) return { error: "You can only post about chapters you've reached." };

  const { error } = await supabase.from("chapter_thoughts").insert({
    user_id: user.id,
    book_id: parsed.data.bookId,
    chapter_number: parsed.data.chapter,
    content: parsed.data.content,
    sentiment_tag: parsed.data.sentiment ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/book");
  return { ok: true };
}

const editThoughtSchema = z.object({
  thoughtId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
  sentiment: z.union([z.literal(""), z.enum(["loved", "liked", "confused", "shocked", "bored", "theory"])]),
});

export async function editThought(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = editThoughtSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.rpc("edit_chapter_thought", {
    p_thought: parsed.data.thoughtId,
    p_content: parsed.data.content,
    p_sentiment: parsed.data.sentiment || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/book");
  return { ok: true };
}

export async function deleteThought(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = z.string().uuid().safeParse(formData.get("thoughtId"));
  if (!id.success) return { error: "Invalid thought." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.rpc("delete_chapter_thought", { p_thought: id.data });
  if (error) return { error: error.message };
  revalidatePath("/book");
  return { ok: true };
}
