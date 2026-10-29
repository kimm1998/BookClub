"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type BookAdminActionState = { error?: string; ok?: boolean };

async function adminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, isAdmin: false };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return { supabase, isAdmin: profile?.role === "admin" };
}

const bookDetailsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(200),
  totalChapters: z.coerce.number().int().positive().max(10000),
  coverUrl: z.union([z.literal(""), z.string().url()]).optional(),
  description: z.string().max(5000).optional(),
});

export async function addBook(
  _: BookAdminActionState,
  formData: FormData,
): Promise<BookAdminActionState> {
  const parsed = bookDetailsSchema.extend({
    status: z.enum(["catalog", "upcoming"]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, isAdmin } = await adminClient();
  if (!isAdmin) return { error: "Only admins can manage books." };
  const { data: authData } = await supabase.auth.getUser();

  const { error } = await supabase.from("books").insert({
    title: parsed.data.title,
    author: parsed.data.author,
    total_chapters: parsed.data.totalChapters,
    cover_url: parsed.data.coverUrl || null,
    description: parsed.data.description || null,
    status: parsed.data.status,
    created_by: authData.user?.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/books");
  revalidatePath("/library");
  revalidatePath("/nominations");
  return { ok: true };
}

const updateBookSchema = bookDetailsSchema.extend({
  bookId: z.string().uuid(),
  status: z.enum(["active_club_read", "completed", "catalog", "upcoming"]),
});

export async function updateBook(
  _: BookAdminActionState,
  formData: FormData,
): Promise<BookAdminActionState> {
  const parsed = updateBookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, isAdmin } = await adminClient();
  if (!isAdmin) return { error: "Only admins can manage books." };

  const { bookId, title, author, totalChapters, coverUrl, description, status } = parsed.data;
  const { error } = await supabase
    .from("books")
    .update({
      title,
      author,
      total_chapters: totalChapters,
      cover_url: coverUrl || null,
      description: description || null,
      status,
    })
    .eq("id", bookId);
  if (error) return { error: error.message };
  revalidatePath("/admin/books");
  revalidatePath("/dashboard");
  revalidatePath("/book");
  revalidatePath("/library");
  revalidatePath("/nominations");
  return { ok: true };
}

export async function activateBook(
  _: BookAdminActionState,
  formData: FormData,
): Promise<BookAdminActionState> {
  const bookId = z.string().uuid().safeParse(formData.get("bookId"));
  if (!bookId.success) return { error: "Invalid book." };
  const { supabase, isAdmin } = await adminClient();
  if (!isAdmin) return { error: "Only admins can select the active club book." };

  const { error } = await supabase.rpc("set_active_club_book", {
    p_book_id: bookId.data,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/books");
  revalidatePath("/dashboard");
  revalidatePath("/book");
  revalidatePath("/discussions");
  return { ok: true };
}
