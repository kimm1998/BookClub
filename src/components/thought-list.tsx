"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Thought = {
  id: string;
  display_name: string | null;
  content: string | null;
  sentiment_tag: string | null;
  created_at: string;
  is_locked: boolean;
};

function ThoughtItem({ t }: { t: Thought }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    </li>
  );
}

export function ThoughtList({ thoughts }: { thoughts: Thought[] }) {
  if (thoughts.length === 0) return <p className="text-sm opacity-70">No thoughts for this chapter yet.</p>;
  return (
    <ul className="space-y-3">
      {thoughts.map((t) => (
        <ThoughtItem key={t.id} t={t} />
      ))}
    </ul>
  );
}
