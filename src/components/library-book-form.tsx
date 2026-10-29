"use client";

import { useActionState } from "react";
import { saveLibraryBook } from "@/app/(app)/library/actions";

type ShelfStatus = "reading" | "completed" | "want_to_read";

export function LibraryBookForm({
  bookId,
  status,
  rating,
  notes,
}: {
  bookId: string;
  status?: ShelfStatus;
  rating?: number | null;
  notes?: string | null;
}) {
  const [state, action, pending] = useActionState(saveLibraryBook, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bookId" value={bookId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium">
          <span>Shelf</span>
          <select
            name="status"
            defaultValue={status ?? "want_to_read"}
            className="block w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/10"
          >
            <option value="reading">Currently reading</option>
            <option value="completed">Completed</option>
            <option value="want_to_read">Want to read</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">
          <span>Rating</span>
          <select
            name="rating"
            defaultValue={rating ?? ""}
            className="block w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/10"
          >
            <option value="">No rating</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>{value} / 5</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-xs font-medium">
        <span>Personal notes</span>
        <textarea
          name="notes"
          defaultValue={notes ?? ""}
          rows={2}
          maxLength={2000}
          className="block w-full rounded-lg bg-white p-2 text-sm ring-1 ring-black/10"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          disabled={pending}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {pending ? "Saving…" : status ? "Save changes" : "Add to library"}
        </button>
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
        {state.ok && <span className="text-sm text-green-700">Saved ✓</span>}
      </div>
    </form>
  );
}
