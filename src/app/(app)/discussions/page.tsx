import { createClient } from "@/lib/supabase/server";
import {
  CommentAdminControls,
  CommentForm,
  CreateTopicForm,
  TopicAdminControls,
} from "@/components/discussion-forms";

type Topic = {
  id: string;
  book_id: string;
  created_by: string;
  title: string;
  prompt_body: string;
  category: string;
  created_at: string;
};

type Comment = {
  id: string;
  topic_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export default async function DiscussionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: topics, error: topicsError }, { data: books }, { data: profile }] = await Promise.all([
    supabase.from("discussion_topics").select("id, book_id, created_by, title, prompt_body, category, created_at").order("created_at", { ascending: false }),
    supabase.from("books").select("id, title").order("title"),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ]);
  if (topicsError) {
    return <p role="alert" className="rounded-xl bg-white p-5 text-red-700">Couldn't load discussions.</p>;
  }

  const topicRows = (topics ?? []) as Topic[];
  const topicIds = topicRows.map((topic) => topic.id);
  const { data: comments, error: commentsError } = topicIds.length
    ? await supabase.from("topic_comments").select("id, topic_id, user_id, content, created_at").in("topic_id", topicIds).order("created_at")
    : { data: [], error: null };
  if (commentsError) {
    return <p role="alert" className="rounded-xl bg-white p-5 text-red-700">Couldn't load discussion replies.</p>;
  }

  const commentRows = (comments ?? []) as Comment[];
  const isAdmin = profile?.role === "admin";
  const authorIds = [...new Set([...topicRows.map((topic) => topic.created_by), ...commentRows.map((comment) => comment.user_id)])];
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("id, display_name, username").in("id", authorIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? p.username ?? "Reader"]));
  const bookById = new Map((books ?? []).map((book) => [book.id, book.title]));
  const activeBook = (books ?? []).length ? (await supabase.from("books").select("id").eq("status", "active_club_read").maybeSingle()).data : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Club discussions</h1>
        <p className="mt-1 text-sm opacity-70">Official prompts and member replies for the club read.</p>
      </header>

      {profile?.role === "admin" && activeBook && (
        <CreateTopicForm bookId={activeBook.id} />
      )}

      {topicRows.length === 0 ? (
        <p className="rounded-xl bg-white p-5 text-sm opacity-70 ring-1 ring-black/5">No discussion prompts yet.</p>
      ) : (
        <div className="space-y-5">
          {topicRows.map((topic) => {
            const topicComments = commentRows.filter((comment) => comment.topic_id === topic.id);
            return (
              <article key={topic.id} className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
                <header className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700">{topic.category.replaceAll("_", " ")}</span>
                    <span className="opacity-60">{bookById.get(topic.book_id) ?? "Book"}</span>
                    <span className="opacity-60">· {new Date(topic.created_at).toLocaleDateString()}</span>
                  </div>
                  <h2 className="text-lg font-semibold">{topic.title}</h2>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{topic.prompt_body}</p>
                  <p className="text-xs opacity-60">Prompt by {profileById.get(topic.created_by) ?? "Club admin"}</p>
                  {isAdmin && <TopicAdminControls topic={topic} />}
                </header>

                <section className="space-y-3 border-t border-black/10 pt-4">
                  <h3 className="text-sm font-semibold">Replies ({topicComments.length})</h3>
                  {topicComments.length > 0 && (
                    <ul className="space-y-3">
                      {topicComments.map((comment) => (
                        <li key={comment.id} className="rounded-lg bg-cream p-3">
                          <div className="mb-1 flex justify-between gap-3 text-xs">
                            <span className="font-semibold">{profileById.get(comment.user_id) ?? "Reader"}</span>
                            <time dateTime={comment.created_at} className="opacity-60">{new Date(comment.created_at).toLocaleString()}</time>
                          </div>
                          <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
                          {(isAdmin || comment.user_id === user.id) && (
                            <CommentAdminControls commentId={comment.id} content={comment.content} />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <CommentForm topicId={topic.id} />
                </section>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
