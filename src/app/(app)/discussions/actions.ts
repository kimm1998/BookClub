"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type DiscussionActionState = { error?: string; ok?: boolean };

const topicSchema = z.object({
  bookId: z.string().uuid(),
  title: z.string().trim().min(3).max(120),
  promptBody: z.string().trim().min(1).max(3000),
  category: z.string().trim().min(1).max(40),
});

export async function createTopic(
  _: DiscussionActionState,
  formData: FormData,
): Promise<DiscussionActionState> {
  const parsed = topicSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Only club admins can create discussion topics." };

  const { error } = await supabase.from("discussion_topics").insert({
    book_id: parsed.data.bookId,
    created_by: user.id,
    title: parsed.data.title,
    prompt_body: parsed.data.promptBody,
    category: parsed.data.category,
  });
  if (error) return { error: error.message };

  revalidatePath("/discussions");
  return { ok: true };
}

const commentSchema = z.object({
  topicId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
});

export async function postComment(
  _: DiscussionActionState,
  formData: FormData,
): Promise<DiscussionActionState> {
  const parsed = commentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("topic_comments").insert({
    topic_id: parsed.data.topicId,
    user_id: user.id,
    content: parsed.data.content,
  });
  if (error) return { error: error.message };

  revalidatePath("/discussions");
  return { ok: true };
}
