import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProgressSlider } from "@/components/progress-slider";
import { ThoughtForm } from "@/components/thought-form";
import { ThoughtList, type Thought } from "@/components/thought-list";

export default async function BookPage({ searchParams }: { searchParams: Promise<{ chapter?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: book } = await supabase
    .from("books")
    .select("id, title, author, total_chapters")
    .eq("status", "active_club_read")
    .maybeSingle();

  if (!book || !user) {
    return <p className="rounded-xl bg-white p-6 ring-1 ring-black/5">No active club book yet.</p>;
  }

  const [{ data: ub }, { data: profile }] = await Promise.all([
    supabase
      .from("user_books")
      .select("current_chapter, status")
      .eq("user_id", user.id)
      .eq("book_id", book.id)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ]);

  const current = ub?.current_chapter ?? 0;
  const { chapter: chapterParam } = await searchParams;
  const requested = Number(chapterParam);
  const chapter = Math.min(
    book.total_chapters,
    Math.max(1, Number.isInteger(requested) && requested > 0 ? requested : current || 1)
  );
  const canPost = ub?.status === "completed" || current >= chapter;

  const { data: thoughts } = await supabase.rpc("get_chapter_thoughts", {
    p_book: book.id,
    p_chapter: chapter,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{book.title}</h1>
        <p className="opacity-70">by {book.author}</p>
      </div>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <ProgressSlider key={current} bookId={book.id} total={book.total_chapters} current={current} />
      </section>

      <section className="space-y-4 rounded-2xl bg-brand-50/50 p-5 ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chapter {chapter} discussion</h2>
          <div className="flex items-center gap-2 text-sm">
            {chapter > 1 && (
              <Link href={`/book?chapter=${chapter - 1}`} className="rounded-lg px-3 py-1 ring-1 ring-black/10 hover:bg-white">
                ← Prev
              </Link>
            )}
            {chapter < book.total_chapters && (
              <Link href={`/book?chapter=${chapter + 1}`} className="rounded-lg px-3 py-1 ring-1 ring-black/10 hover:bg-white">
                Next →
              </Link>
            )}
          </div>
        </div>

        {chapter > current && ub?.status !== "completed" && (
          <p className="text-sm">
            🔒 You haven&apos;t reached this chapter. Other readers&apos; thoughts are hidden until you do, or you can reveal them one at a time.
          </p>
        )}

        <ThoughtForm bookId={book.id} chapter={chapter} canPost={canPost} />
        <ThoughtList thoughts={(thoughts ?? []) as Thought[]} currentUserId={user.id} isAdmin={profile?.role === "admin"} />
      </section>
    </div>
  );
}
