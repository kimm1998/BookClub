"use client";

import { useActionState, useState } from "react";
import { updateProgress } from "@/app/(app)/book/actions";

export function ProgressSlider({
  bookId,
  total,
  current,
}: {
  bookId: string;
  total: number;
  current: number;
}) {
  const [value, setValue] = useState(current);
  const [state, action, pending] = useActionState(updateProgress, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="chapter" value={value} />
      <div className="flex items-center justify-between text-sm font-medium">
        <label htmlFor="chapter-slider">Your progress</label>
        <span>
          Chapter {value} / {total}
        </span>
      </div>
      <input
        id="chapter-slider"
        type="range"
        min={0}
        max={total}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-brand-500"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setValue((v) => Math.max(0, v - 1))}
          className="rounded-lg px-3 py-1.5 ring-1 ring-black/10 hover:bg-brand-50"
          aria-label="Previous chapter"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setValue((v) => Math.min(total, v + 1))}
          className="rounded-lg px-3 py-1.5 ring-1 ring-black/10 hover:bg-brand-50"
          aria-label="Next chapter"
        >
          +
        </button>
        <button
          disabled={pending || value === current}
          className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save progress"}
        </button>
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
        {state.ok && <span className="text-sm text-green-700">Saved ✓</span>}
      </div>
    </form>
  );
}
