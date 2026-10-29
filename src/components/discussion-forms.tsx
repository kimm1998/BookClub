"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTopic, postComment } from "@/app/(app)/discussions/actions";

export function CreateTopicForm({ bookId }: { bookId: string }) {
  const [state, action, pending] = useActionState(createTopic, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h2 className="font-semibold">Create an official prompt</h2>
      <input type="hidden" name="bookId" value={bookId} />
      <label className="block space-y-1 text-sm">
        <span>Title</span>
        <input name="title" required minLength={3} maxLength={120} className="w-full rounded-lg px-3 py-2 ring-1 ring-black/10" />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Prompt</span>
        <textarea name="promptBody" required maxLength={3000} rows={3} className="w-full rounded-lg p-3 ring-1 ring-black/10" />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Category</span>
        <select name="category" defaultValue="general" className="rounded-lg bg-white px-3 py-2 ring-1 ring-black/10">
          <option value="general">General</option>
          <option value="character_analysis">Character analysis</option>
          <option value="theory">Theory</option>
          <option value="mid_book">Mid-book discussion</option>
          <option value="ending">Ending</option>
        </select>
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Publishing…" : "Publish prompt"}
        </button>
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
        {state.ok && <span className="text-sm text-green-700">Published ✓</span>}
      </div>
    </form>
  );
}

export function CommentForm({ topicId }: { topicId: string }) {
  const [state, action, pending] = useActionState(postComment, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="topicId" value={topicId} />
      <label className="sr-only" htmlFor={`comment-${topicId}`}>Write a reply</label>
      <textarea id={`comment-${topicId}`} name="content" required maxLength={2000} rows={2} placeholder="Add to the discussion…" className="w-full rounded-lg bg-white p-3 text-sm ring-1 ring-black/10" />
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Posting…" : "Reply"}
        </button>
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}
