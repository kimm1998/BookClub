"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  castVote,
  createCycle,
  createNomination,
  deleteNomination,
  editNomination,
  finalizeCycle,
  closeCycle,
  type NominationActionState,
} from "@/app/(app)/nominations/actions";

type SearchResult = {
  googleBooksId: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
};

function SearchBooks({ onSelect }: { onSelect: (book: SearchResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
      const payload = (await response.json()) as { results?: SearchResult[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Search failed.");
      setResults(payload.results ?? []);
      if (!payload.results?.length) setError("No matching books found. You can enter the details manually below.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Book search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg bg-brand-50 p-3">
      <form onSubmit={search} className="flex gap-2">
        <label className="sr-only" htmlFor="book-search">Search Google Books</label>
        <input
          id="book-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          minLength={2}
          maxLength={100}
          placeholder="Search title or author"
          className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/10"
        />
        <button disabled={loading || query.trim().length < 2} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold ring-1 ring-black/10 disabled:opacity-50">
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
      {error && <p role="status" className="text-xs opacity-70">{error}</p>}
      {results.length > 0 && (
        <ul className="max-h-64 space-y-2 overflow-auto">
          {results.map((book) => (
            <li key={book.googleBooksId}>
              <button
                type="button"
                onClick={() => onSelect(book)}
                className="w-full rounded-lg bg-white p-3 text-left text-sm ring-1 ring-black/5 hover:ring-brand-500"
              >
                <span className="block font-semibold">{book.title}</span>
                <span className="opacity-70">{book.author}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NominationForm({ cycleId }: { cycleId: string }) {
  const [state, action, pending] = useActionState(createNomination, {});
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setSelected(null);
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h2 className="font-semibold">Nominate a book</h2>
      <input type="hidden" name="cycleId" value={cycleId} />
      <SearchBooks onSelect={setSelected} />
      <input type="hidden" name="googleBooksId" value={selected?.googleBooksId ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Title</span>
          <input name="title" required maxLength={200} value={selected?.title} onChange={(e) => setSelected((s) => s ? { ...s, title: e.target.value } : null)} className="w-full rounded-lg px-3 py-2 ring-1 ring-black/10" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Author</span>
          <input name="author" required maxLength={200} value={selected?.author} onChange={(e) => setSelected((s) => s ? { ...s, author: e.target.value } : null)} className="w-full rounded-lg px-3 py-2 ring-1 ring-black/10" />
        </label>
      </div>
      <input type="hidden" name="coverUrl" value={selected?.coverUrl ?? ""} />
      <input type="hidden" name="description" value={selected?.description ?? ""} />
      <label className="block space-y-1 text-sm">
        <span>Why should the club read it? <span className="opacity-60">(optional)</span></span>
        <textarea name="pitchNote" maxLength={1000} rows={2} className="w-full rounded-lg p-3 ring-1 ring-black/10" />
      </label>
      <p className="text-xs opacity-60">Books added from a nomination start with 1 chapter. An admin can set the correct chapter count before selecting it.</p>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Submitting…" : "Submit nomination"}
        </button>
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
        {state.ok && <span className="text-sm text-green-700">Nominated ✓</span>}
      </div>
    </form>
  );
}

export function NominationEditControls({
  nominationId,
  title,
  author,
  pitchNote,
}: {
  nominationId: string;
  title: string;
  author: string;
  pitchNote: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState(editNomination, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteNomination, {});

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing((current) => !current)}
          className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-black/10 hover:bg-brand-50"
        >
          {editing ? "Cancel edit" : "Edit suggestion"}
        </button>
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!window.confirm("Delete this book suggestion?")) event.preventDefault();
          }}
        >
          <input type="hidden" name="nominationId" value={nominationId} />
          <button disabled={deletePending} className="rounded-md px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50">
            {deletePending ? "Deleting…" : "Delete suggestion"}
          </button>
          {deleteState.error && <p role="alert" className="mt-1 text-xs text-red-700">{deleteState.error}</p>}
        </form>
      </div>
      {editing && (
        <form action={editAction} className="space-y-2 rounded-lg bg-cream p-3">
          <input type="hidden" name="nominationId" value={nominationId} />
          <label className="block space-y-1 text-xs">
            <span>Title</span>
            <input name="title" required maxLength={200} defaultValue={title} className="w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/10" />
          </label>
          <label className="block space-y-1 text-xs">
            <span>Author</span>
            <input name="author" required maxLength={200} defaultValue={author} className="w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/10" />
          </label>
          <label className="block space-y-1 text-xs">
            <span>Why should the club read it?</span>
            <textarea name="pitchNote" maxLength={1000} rows={2} defaultValue={pitchNote ?? ""} className="w-full rounded-lg bg-white p-2 text-sm ring-1 ring-black/10" />
          </label>
          <div className="flex items-center gap-2">
            <button disabled={editPending} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              {editPending ? "Saving…" : "Save suggestion"}
            </button>
            {editState.error && <span role="alert" className="text-xs text-red-700">{editState.error}</span>}
            {editState.ok && <span className="text-xs text-green-700">Saved</span>}
          </div>
        </form>
      )}
    </div>
  );
}

export function VoteButton({ nominationId, voted }: { nominationId: string; voted: boolean }) {
  const [state, action, pending] = useActionState(castVote, {});
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="nominationId" value={nominationId} />
      <button disabled={pending} className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Saving…" : voted ? "Your vote ✓" : "Vote"}
      </button>
      {state.error && <p role="alert" className="text-xs text-red-700">{state.error}</p>}
    </form>
  );
}

export function CreateCycleForm() {
  const [state, action, pending] = useActionState(createCycle, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <label className="flex-1 space-y-1 text-sm">
        <span>Open a nomination cycle</span>
        <input name="name" required minLength={2} maxLength={100} placeholder="e.g. November Book Vote" className="w-full rounded-lg px-3 py-2 ring-1 ring-black/10" />
      </label>
      <button disabled={pending} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Opening…" : "Open cycle"}
      </button>
      {state.error && <span role="alert" className="w-full text-sm text-red-700">{state.error}</span>}
    </form>
  );
}

function CycleAdminActions({ cycleId }: { cycleId: string }) {
  const [closeState, closeAction, closePending] = useActionState(closeCycle, {});
  return (
    <div className="flex flex-wrap items-center gap-3">
      <form action={closeAction}>
        <input type="hidden" name="cycleId" value={cycleId} />
        <button disabled={closePending} className="rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-black/10 hover:bg-white disabled:opacity-50">
          {closePending ? "Closing…" : "Close without selecting"}
        </button>
      </form>
      {closeState.error && <span role="alert" className="text-sm text-red-700">{closeState.error}</span>}
    </div>
  );
}

export function AdminCycleActions({ cycleId }: { cycleId: string }) {
  return <CycleAdminActions cycleId={cycleId} />;
}

export function FinalizeButton({ cycleId, nominationId }: { cycleId: string; nominationId: string }) {
  const [state, action, pending] = useActionState(
    async (previous: NominationActionState, formData: FormData) => finalizeCycle(previous, formData),
    {},
  );
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="cycleId" value={cycleId} />
      <input type="hidden" name="nominationId" value={nominationId} />
      <button disabled={pending} className="rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-black/10 hover:bg-brand-50 disabled:opacity-50">
        {pending ? "Finalizing…" : "Select as next read"}
      </button>
      {state.error && <p role="alert" className="text-xs text-red-700">{state.error}</p>}
    </form>
  );
}
