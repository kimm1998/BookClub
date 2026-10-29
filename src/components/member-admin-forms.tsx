"use client";

import { useActionState } from "react";
import {
  changeRole,
  createInvite,
  removeMember,
  revokeInvite,
  type MemberActionState,
} from "@/app/(app)/admin/members/actions";

const initial: MemberActionState = {};
const field = "rounded-lg border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-brand-500";
const btn = "rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60";

function Err({ state }: { state: MemberActionState }) {
  return state.error ? (
    <p role="alert" className="mt-1 text-xs text-red-700">
      {state.error}
    </p>
  ) : null;
}

export function RoleForm({ userId, role }: { userId: string; role: "admin" | "member" }) {
  const [state, action, pending] = useActionState(changeRole, initial);
  const next = role === "admin" ? "member" : "admin";
  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value={next} />
      <button disabled={pending} className={`${btn} bg-brand-50 text-brand-700 hover:bg-brand-500/20`}>
        {role === "admin" ? "Make member" : "Make admin"}
      </button>
      <Err state={state} />
    </form>
  );
}

export function RemoveForm({ userId, name }: { userId: string; name: string }) {
  const [state, action, pending] = useActionState(removeMember, initial);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Remove ${name}? Their account and all their data will be deleted.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button disabled={pending} className={`${btn} bg-red-50 text-red-700 hover:bg-red-100`}>
        Remove
      </button>
      <Err state={state} />
    </form>
  );
}

export function CreateInviteForm() {
  const [state, action, pending] = useActionState(createInvite, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 ring-1 ring-black/5">
      <label className="text-sm">
        Role
        <select name="role" className={`${field} mt-1 block`}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <label className="text-sm">
        Max uses
        <input name="maxUses" type="number" min={1} max={500} defaultValue={1} className={`${field} mt-1 block w-24`} />
      </label>
      <label className="text-sm">
        Expires in (days, 0 = never)
        <input name="days" type="number" min={0} max={365} defaultValue={7} className={`${field} mt-1 block w-28`} />
      </label>
      <label className="text-sm">
        Note
        <input name="note" maxLength={100} placeholder="Who is it for?" className={`${field} mt-1 block`} />
      </label>
      <button disabled={pending} className={`${btn} bg-brand-600 text-white hover:bg-brand-700`}>
        {pending ? "Creating…" : "Create invite"}
      </button>
      <Err state={state} />
    </form>
  );
}

export function RevokeForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(revokeInvite, initial);
  return (
    <form action={action}>
      <input type="hidden" name="code" value={code} />
      <button disabled={pending} className={`${btn} bg-red-50 text-red-700 hover:bg-red-100`}>
        Revoke
      </button>
      <Err state={state} />
    </form>
  );
}
