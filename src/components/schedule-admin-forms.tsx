"use client";

import { useActionState } from "react";
import { deleteGoal, saveGoal, type ScheduleActionState } from "@/app/(app)/admin/schedule/actions";

const initial: ScheduleActionState = {};
const field = "mt-1 block rounded-lg border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-brand-500";

export function GoalForm({ bookId, maxChapter }: { bookId: string; maxChapter: number }) {
  const [state, action, pending] = useActionState(saveGoal, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 ring-1 ring-black/5">
      <input type="hidden" name="bookId" value={bookId} />
      <label className="text-sm">
        Chapter
        <input name="chapter" type="number" min={1} max={maxChapter} required className={`${field} w-24`} />
      </label>
      <label className="text-sm">
        Finish by
        <input name="date" type="date" required className={field} />
      </label>
      <button
        disabled={pending}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add / update goal"}
      </button>
      {state.error && (
        <p role="alert" className="w-full text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function DeleteGoalForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteGoal, initial);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button disabled={pending} className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60">
        Delete
      </button>
      {state.error && <p role="alert" className="text-xs text-red-700">{state.error}</p>}
    </form>
  );
}
