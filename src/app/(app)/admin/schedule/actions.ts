"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ScheduleActionState = { error?: string; ok?: boolean };

async function adminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, isAdmin: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, isAdmin: profile?.role === "admin" };
}

function refresh() {
  revalidatePath("/admin/schedule");
  revalidatePath("/dashboard");
  revalidatePath("/book");
}

export async function saveGoal(_: ScheduleActionState, formData: FormData): Promise<ScheduleActionState> {
  const parsed = z
    .object({
      bookId: z.string().uuid(),
      chapter: z.coerce.number().int().positive().max(10000),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, isAdmin } = await adminClient();
  if (!isAdmin) return { error: "Only admins can edit the schedule." };

  const { data: book } = await supabase
    .from("books")
    .select("total_chapters")
    .eq("id", parsed.data.bookId)
    .single();
  if (!book) return { error: "Book not found." };
  if (parsed.data.chapter > book.total_chapters) {
    return { error: `This book only has ${book.total_chapters} chapters.` };
  }

  const { error } = await supabase.from("reading_schedules").upsert(
    { book_id: parsed.data.bookId, target_chapter: parsed.data.chapter, target_date: parsed.data.date },
    { onConflict: "book_id,target_chapter" },
  );
  if (error) return { error: "Couldn't save the goal." };
  refresh();
  return { ok: true };
}

export async function deleteGoal(_: ScheduleActionState, formData: FormData): Promise<ScheduleActionState> {
  const parsed = z.string().uuid().safeParse(formData.get("id"));
  if (!parsed.success) return { error: "Invalid request." };
  const { supabase, isAdmin } = await adminClient();
  if (!isAdmin) return { error: "Only admins can edit the schedule." };
  const { error } = await supabase.from("reading_schedules").delete().eq("id", parsed.data);
  if (error) return { error: "Couldn't delete the goal." };
  refresh();
  return { ok: true };
}
