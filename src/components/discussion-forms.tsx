"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createTopic,
  deleteComment,
  deleteTopic,
  editComment,
  editTopic,
  postComment,
} from "@/app/(app)/discussions/actions";

type TopicDetails = { id: string; title: string; prompt_body: string; category: string };

function TopicControls({ topic }: { topic: TopicDetails }) {
  const [editing, setEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState(editTopic, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTopic, {});
  const categories = ["general", "character_analysis", "theory", "mid_book", "ending"];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing((current) => !current)}
          className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-black/10 hover:bg-brand-50"
        >
          {editing ? "Cancel edit" : "Edit prompt"}
        </button>
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!window.confirm("Delete this prompt and all its replies?")) event.preventDefault();
          }}
        >
          <input type="hidden" name="topicId" value={topic.id} />
          <button disabled={deletePending} className="rounded-md px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50">
            {deletePending ? "Deleting…" : "Delete prompt"}
          </button>
          {deleteState.error && <p role="alert" className="mt-1 text-xs text-red-700">{deleteState.error}</p>}
        </form>
      </div>
      {editing && (
        <form action={editAction} className="space-y-2 rounded-lg bg-cream p-3">
          <input type="hidden" name="topicId" value={topic.id} />
          <input name="title" required minLength={3} maxLength={120} defaultValue={topic.title} className="w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/10" />
          <textarea name="promptBody" required maxLength={3000} rows={3} defaultValue={topic.prompt_body} className="w-full rounded-lg bg-white p-3 text-sm ring-1 ring-black/10" />
          <div className="flex flex-wrap items-center gap-2">
            <select name="category" defaultValue={topic.category} className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/10">
              {categories.map((category) => <option key={category} value={category}>{category.replaceAll("_", " ")}</option>)}
            </select>
            <button disabled={editPending} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              {editPending ? "Saving…" : "Save prompt"}
            </button>
            {editState.error && <span role="alert" className="text-xs text-red-700">{editState.error}</span>}
            {editState.ok && <span className="text-xs text-green-700">Saved</span>}
          </div>
        </form>
      )}
    </div>
  );
}

function CommentControls({ commentId, content }: { commentId: string; content: string }) {
  const [editing, setEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState(editComment, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteComment, {});

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing((current) => !current)}
          className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-black/10 hover:bg-white"
        >
          {editing ? "Cancel edit" : "Edit"}
        </button>
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!window.confirm("Delete this reply?")) event.preventDefault();
          }}
        >
          <input type="hidden" name="commentId" value={commentId} />
          <button disabled={deletePending} className="rounded-md px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50">
            {deletePending ? "Deleting…" : "Delete"}
          </button>
          {deleteState.error && <p role="alert" className="mt-1 text-xs text-red-700">{deleteState.error}</p>}
        </form>
      </div>
      {editing && (
        <form action={editAction} className="space-y-2">
          <input type="hidden" name="commentId" value={commentId} />
          <textarea name="content" required maxLength={2000} rows={2} defaultValue={content} className="w-full rounded-lg bg-white p-2 text-sm ring-1 ring-black/10" />
          <div className="flex items-center gap-2">
            <button disabled={editPending} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              {editPending ? "Saving…" : "Save"}
            </button>
            {editState.error && <span role="alert" className="text-xs text-red-700">{editState.error}</span>}
            {editState.ok && <span className="text-xs text-green-700">Saved</span>}
          </div>
        </form>
      )}
    </div>
  );
}

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

export function TopicAdminControls({ topic }: { topic: TopicDetails }) {
  return <TopicControls topic={topic} />;
}

export function CommentAdminControls({ commentId, content }: { commentId: string; content: string }) {
  return <CommentControls commentId={commentId} content={content} />;
}
