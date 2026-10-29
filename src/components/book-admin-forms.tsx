"use client";

import { useActionState, useEffect, useRef } from "react";
import { activateBook, addBook, updateBook } from "@/app/(app)/admin/books/actions";

type BookFields = {
  id: string;
  title: string;
  author: string;
  total_chapters: number;
  cover_url: string | null;
  description: string | null;
  status: "active_club_read" | "completed" | "upcoming" | "catalog";
};

export function AddBookForm() {
  const [state, action, pending] = useActionState(addBook, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h2 className="font-semibold">Add a book to the club catalog</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm"><span>Title</span><input name="title" required maxLength={200} className="w-full rounded-lg px-3 py-2 ring-1 ring-black/10" /></label>
        <label className="space-y-1 text-sm"><span>Author</span><input name="author" required maxLength={200} className="w-full rounded-lg px-3 py-2 ring-1 ring-black/10" /></label>
        <label className="space-y-1 text-sm"><span>Total chapters</span><input name="totalChapters" type="number" min={1} max={10000} defaultValue={1} required className="w-full rounded-lg px-3 py-2 ring-1 ring-black/10" /></label>
        <label className="space-y-1 text-sm"><span>Cover URL <span className="opacity-60">(optional)</span></span><input name="coverUrl" type="url" className="w-full rounded-lg px-3 py-2 ring-1 ring-black/10" /></label>
      </div>
      <label className="block space-y-1 text-sm"><span>Description</span><textarea name="description" rows={2} maxLength={5000} className="w-full rounded-lg p-3 ring-1 ring-black/10" /></label>
      <label className="space-y-1 text-sm"><span>Initial status</span><select name="status" defaultValue="catalog" className="ml-2 rounded-lg bg-white px-3 py-2 ring-1 ring-black/10"><option value="catalog">Catalog</option><option value="upcoming">Upcoming</option></select></label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Adding…" : "Add book"}</button>
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
        {state.ok && <span className="text-sm text-green-700">Added ✓</span>}
      </div>
    </form>
  );
}

export function BookEditor({ book }: { book: BookFields }) {
  const [state, action, pending] = useActionState(updateBook, {});
  const [activateState, activateAction, activatePending] = useActionState(activateBook, {});
  return (
    <article className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <form action={action} className="space-y-3">
        <input type="hidden" name="bookId" value={book.id} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{book.title}</h2>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold">{book.status.replaceAll("_", " ")}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm"><span>Title</span><input name="title" defaultValue={book.title} required maxLength={200} className="w-full rounded-lg px-3 py-2 ring-1 ring-black/10" /></label>
          <label className="space-y-1 text-sm"><span>Author</span><input name="author" defaultValue={book.author} required maxLength={200} className="w-full rounded-lg px-3 py-2 ring-1 ring-black/10" /></label>
          <label className="space-y-1 text-sm"><span>Total chapters</span><input name="totalChapters" type="number" min={1} max={10000} defaultValue={book.total_chapters} required className="w-full rounded-lg px-3 py-2 ring-1 ring-black/10" /></label>
          <label className="space-y-1 text-sm"><span>Cover URL</span><input name="coverUrl" type="url" defaultValue={book.cover_url ?? ""} className="w-full rounded-lg px-3 py-2 ring-1 ring-black/10" /></label>
        </div>
        <label className="block space-y-1 text-sm"><span>Description</span><textarea name="description" defaultValue={book.description ?? ""} rows={2} maxLength={5000} className="w-full rounded-lg p-3 ring-1 ring-black/10" /></label>
        {book.status === "active_club_read" ? (
          <input type="hidden" name="status" value="active_club_read" />
        ) : (
          <label className="space-y-1 text-sm"><span>Status</span><select name="status" defaultValue={book.status} className="ml-2 rounded-lg bg-white px-3 py-2 ring-1 ring-black/10"><option value="catalog">Catalog</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option></select></label>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending} className="rounded-lg px-4 py-2 text-sm font-semibold ring-1 ring-black/10 hover:bg-brand-50 disabled:opacity-50">{pending ? "Saving…" : "Save book details"}</button>
          {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
          {state.ok && <span className="text-sm text-green-700">Saved ✓</span>}
        </div>
      </form>
      {book.status !== "active_club_read" && (
        <form action={activateAction} className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-3">
          <input type="hidden" name="bookId" value={book.id} />
          <button disabled={activatePending} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{activatePending ? "Selecting…" : "Make active club read"}</button>
          {activateState.error && <span role="alert" className="text-sm text-red-700">{activateState.error}</span>}
        </form>
      )}
    </article>
  );
}
