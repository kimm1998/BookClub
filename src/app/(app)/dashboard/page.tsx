import { createClient } from "@/lib/supabase/server";

type ProgressRow = {
  user_id: string;
  display_name: string | null;
  current_chapter: number;
  total_chapters: number;
  pct: number | string;
  status: string;
};

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2.5 w-full overflow-hidden rounded-full bg-brand-50"
    >
      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${v}%` }} />
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books")
    .select("id, title, author, cover_url, description, total_chapters")
    .eq("status", "active_club_read")
    .maybeSingle();

  if (!book) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-4 rounded-xl bg-white p-6 ring-1 ring-black/5">
          No active club book yet. An admin can pick one from the catalog.
        </p>
      </div>
    );
  }

  const [{ data: rows }, { data: schedule }] = await Promise.all([
    supabase
      .from("book_progress")
      .select("user_id, display_name, current_chapter, total_chapters, pct, status")
      .eq("book_id", book.id)
      .order("current_chapter", { ascending: false }),
    supabase
      .from("reading_schedules")
      .select("target_chapter, target_date")
      .eq("book_id", book.id)
      .order("target_date", { ascending: true }),
  ]);

  const readers = (rows ?? []) as ProgressRow[];
  const groupPct = readers.length
    ? Math.round(readers.reduce((s, r) => s + Number(r.pct), 0) / readers.length)
    : 0;
  const today = new Date().toISOString().slice(0, 10);
  const nextGoal = (schedule ?? []).find((s) => s.target_date >= today);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Spotlight */}
      <section className="flex flex-col gap-5 rounded-2xl bg-white p-5 ring-1 ring-black/5 sm:flex-row">
        {book.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.cover_url}
            alt={`Cover of ${book.title}`}
            className="h-56 w-40 shrink-0 self-center rounded-lg object-cover shadow-md sm:self-start"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-56 w-40 shrink-0 items-center justify-center self-center rounded-lg bg-brand-50 text-5xl sm:self-start"
          >
            📖
          </div>
        )}

        <div className="flex-1 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Current club read</p>
          <h2 className="text-2xl font-bold">{book.title}</h2>
          <p className="opacity-70">by {book.author}</p>
          {book.description && <p className="text-sm leading-relaxed">{book.description}</p>}

          <p className="text-sm">
            <strong>{book.total_chapters}</strong> chapters
            {nextGoal && (
              <>
                {" · "}next goal: <strong>chapter {nextGoal.target_chapter}</strong> by{" "}
                <strong>{new Date(nextGoal.target_date).toLocaleDateString()}</strong>
              </>
            )}
          </p>

          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-sm font-medium">
              <span>Group completion</span>
              <span>{groupPct}%</span>
            </div>
            <ProgressBar value={groupPct} />
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="mb-4 text-lg font-semibold">Reader progress</h2>
        {readers.length === 0 ? (
          <p className="text-sm opacity-70">Nobody has started yet. Be the first!</p>
        ) : (
          <ol className="space-y-4">
            {readers.map((r, i) => (
              <li key={r.user_id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {i + 1}. {r.display_name ?? "Reader"}
                    {r.status === "completed" && " 🎉"}
                  </span>
                  <span className="opacity-70">
                    Ch. {r.current_chapter}/{r.total_chapters}
                  </span>
                </div>
                <ProgressBar value={Number(r.pct)} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
