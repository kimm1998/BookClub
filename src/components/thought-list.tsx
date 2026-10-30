"use client";

import { useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteThought, editThought } from "@/app/(app)/book/actions";

export type Thought = {
  id: string;
  user_id: string;
  display_name: string | null;
  content: string | null;
  sentiment_tag: string | null;
  created_at: string;
  is_locked: boolean;
};

function ThoughtItem({ t, canManage }: { t: Thought; canManage: boolean }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState(editThought, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteThought, {});

  async function reveal() {
    setLoading(true);
    setError(null);
    const { data, error } = await createClient().rpc("reveal_thought", { p_thought: t.id });
    setLoading(false);
    if (error || !data) setError("Couldn't reveal this thought.");
    else setRevealed(data as string);
  }

  const text = t.is_locked ? revealed : t.content;

  return (
    <li className="rounded-xl bg-white p-4 ring-1 ring-black/5">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-semibold">{t.display_name ?? "Reader"}</span>
        <span className="flex items-center gap-2 opacity-70">
          {t.sentiment_tag && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs">{t.sentiment_tag}</span>}
          {new Date(t.created_at).toLocaleDateString()}
        </span>
      </div>
      {text ? (
        <p className="text-sm leading-relaxed">{text}</p>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-brand-50 p-3">
          <p aria-hidden className="select-none text-sm blur-sm">Hidden spoiler text from a later chapter</p>
          <button
            onClick={reveal}
            disabled={loading}
            className="shrink-0 rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? "…" : "⚠️ Reveal spoiler"}
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
      {canManage && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(!t.is_locked || revealed !== null) && (
            <button
              type="button"
              onClick={() => setEditing((current) => !current)}
              className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-black/10 hover:bg-brand-50"
            >
              {editing ? "Cancel edit" : "Edit"}
            </button>
          )}
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (!window.confirm("Delete this thought?")) event.preventDefault();
            }}
          >
            <input type="hidden" name="thoughtId" value={t.id} />
            <button disabled={deletePending} className="rounded-md px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50">
              {deletePending ? "Deleting…" : "Delete"}
            </button>
            {deleteState.error && <p role="alert" className="mt-1 text-xs text-red-700">{deleteState.error}</p>}
          </form>
        </div>
      )}
      {editing && canManage && (
        <form action={editAction} className="mt-3 space-y-2">
          <input type="hidden" name="thoughtId" value={t.id} />
          <textarea
            name="content"
            required
            maxLength={2000}
            defaultValue={t.content ?? revealed ?? ""}
            className="w-full rounded-lg p-2 text-sm ring-1 ring-black/10"
            rows={3}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select name="sentiment" defaultValue={t.sentiment_tag ?? ""} aria-label="Mood" className="rounded-lg px-2 py-1.5 text-sm ring-1 ring-black/10">
              <option value="">No mood</option>
              {["loved", "liked", "confused", "shocked", "bored", "theory"].map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <button disabled={editPending} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              {editPending ? "Saving…" : "Save"}
            </button>
            {editState.error && <span role="alert" className="text-xs text-red-700">{editState.error}</span>}
            {editState.ok && <span className="text-xs text-green-700">Saved</span>}
          </div>
        </form>
      )}
    </li>
  );
}

export function ThoughtList({
  thoughts,
  currentUserId,
  isAdmin,
}: {
  thoughts: Thought[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  if (thoughts.length === 0) return <p className="text-sm opacity-70">No thoughts for this chapter yet.</p>;
  return (
    <ul className="space-y-3">
      {thoughts.map((t) => (
        <ThoughtItem key={t.id} t={t} canManage={isAdmin || t.user_id === currentUserId} />
      ))}
    </ul>
  );
}
