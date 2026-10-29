"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type MemberActionState = { error?: string; ok?: boolean };

async function adminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null, isAdmin: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, userId: user.id, isAdmin: profile?.role === "admin" };
}

const idSchema = z.string().uuid();

export async function changeRole(_: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const parsed = z
    .object({ userId: idSchema, role: z.enum(["admin", "member"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };
  const { supabase, isAdmin } = await adminClient();
  if (!isAdmin) return { error: "Only admins can change roles." };
  const { error } = await supabase.rpc("set_member_role", { p_user: parsed.data.userId, p_role: parsed.data.role });
  if (error) return { error: error.message };
  revalidatePath("/admin/members");
  return { ok: true };
}

export async function removeMember(_: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const parsed = idSchema.safeParse(formData.get("userId"));
  if (!parsed.success) return { error: "Invalid request." };
  const { supabase, isAdmin } = await adminClient();
  if (!isAdmin) return { error: "Only admins can remove members." };
  const { error } = await supabase.rpc("remove_member", { p_user: parsed.data });
  if (error) return { error: error.message };
  revalidatePath("/admin/members");
  return { ok: true };
}

export async function createInvite(_: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const parsed = z
    .object({
      role: z.enum(["admin", "member"]),
      maxUses: z.coerce.number().int().min(1).max(500),
      days: z.coerce.number().int().min(0).max(365),
      note: z.string().trim().max(100).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, userId, isAdmin } = await adminClient();
  if (!isAdmin) return { error: "Only admins can create invites." };

  const { role, maxUses, days, note } = parsed.data;
  const code = randomBytes(5).toString("hex").toUpperCase();
  const { error } = await supabase.from("invite_codes").insert({
    code,
    role,
    max_uses: maxUses,
    note: note || null,
    created_by: userId,
    expires_at: days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
  });
  if (error) return { error: "Couldn't create the invite." };
  revalidatePath("/admin/members");
  return { ok: true };
}

export async function revokeInvite(_: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const parsed = z.string().min(1).max(64).safeParse(formData.get("code"));
  if (!parsed.success) return { error: "Invalid request." };
  const { supabase, isAdmin } = await adminClient();
  if (!isAdmin) return { error: "Only admins can revoke invites." };
  const { error } = await supabase.from("invite_codes").update({ revoked: true }).eq("code", parsed.data);
  if (error) return { error: "Couldn't revoke the invite." };
  revalidatePath("/admin/members");
  return { ok: true };
}
