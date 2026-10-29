"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LibraryActionState = { error?: string; ok?: boolean };

const librarySchema = z.object({
  bookId: z.string().uuid(),
  status: z.enum(["reading", "completed", "want_to_read"]),
  rating: z.union([z.literal(""), z.coerce.number().int().min(1).max(5)]).optional(),
  notes: z.string().max(2000).optional(),
});

export async function saveLibraryBook(
  _: LibraryActionState,
  formData: FormData,
): Promise<LibraryActionState> {
  const parsed = librarySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { bookId, status, rating, notes } = parsed.data;
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("total_chapters")
    .eq("id", bookId)
    .single();
  if (bookError || !book) return { error: "Book not found." };

  const { error } = await supabase.from("user_books").upsert(
    {
      user_id: user.id,
      book_id: bookId,
      status,
      ...(status === "completed" ? { current_chapter: book.total_chapters } : {}),
      finished_at: status === "completed" ? new Date().toISOString() : null,
      rating: rating === "" || rating === undefined ? null : Number(rating),
      notes: notes?.trim() || null,
    },
    { onConflict: "user_id,book_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/library");
  revalidatePath("/dashboard");
  return { ok: true };
}
