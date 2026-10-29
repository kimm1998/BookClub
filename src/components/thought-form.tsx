"use client";

import { useActionState, useEffect, useRef } from "react";
import { postThought } from "@/app/(app)/book/actions";

const tags = ["loved", "liked", "confused", "shocked", "bored", "theory"];

export function ThoughtForm({ bookId, chapter, canPost }: { bookId: string; chapter: number; canPost: boolean }) {
  const [state, action, pending] = useActionState(postThought, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  if (!canPost) {
    return (
      <p className="rounded-lg bg-brand-50 p-3 text-sm">
        Update your progress to chapter {chapter} to share your thoughts here.
      </p>
    );
  }

  return (
    <form ref={ref} action={action} className="space-y-3">
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="chapter" value={chapter} />
      <label htmlFor="content" className="sr-only">Your thoughts</label>
      <textarea
        id="content"
        name="content"
        required
        maxLength={2000}
        rows={3}
        placeholder={`Your thoughts on chapter ${chapter}…`}
        className="w-full rounded-lg bg-white p-3 text-sm ring-1 ring-black/10 focus:ring-2 focus:ring-brand-500 focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3">
        <select name="sentiment" defaultValue="" aria-label="Mood" className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-black/10">
          <option value="">Mood (optional)</option>
          {tags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          disabled={pending}
          className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {pending ? "Posting…" : "Post"}
        </button>
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}
