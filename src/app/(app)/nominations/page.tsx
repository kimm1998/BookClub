import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  AdminCycleActions,
  CreateCycleForm,
  FinalizeButton,
  NominationEditControls,
  NominationForm,
  VoteButton,
} from "@/components/nomination-forms";

type Cycle = {
  id: string;
  name: string;
  status: "open" | "closed";
  opens_at: string;
};

type Nomination = {
  id: string;
  user_id: string;
  book_id: string;
  title: string;
  author: string;
  pitch_note: string | null;
  status: "pending" | "shortlisted" | "selected";
  created_at: string;
};

export default async function NominationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: cycles, error: cycleError }, { data: profile }, { data: books }] = await Promise.all([
    supabase.from("nomination_cycles").select("id, name, status, opens_at").order("opens_at", { ascending: false }),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("books").select("id, title, author, cover_url, total_chapters").order("title"),
  ]);
  if (cycleError) {
    return <p role="alert" className="rounded-xl bg-white p-5 text-red-700">Couldn't load nomination cycles.</p>;
  }

  const cycleRows = (cycles ?? []) as Cycle[];
  const { cycle: requestedCycle } = await searchParams;
  const activeCycle =
    cycleRows.find((cycle) => cycle.id === requestedCycle) ??
    cycleRows.find((cycle) => cycle.status === "open") ??
    cycleRows[0];
  const isAdmin = profile?.role === "admin";
  let nominationRows: Nomination[] = [];
  let voteCounts = new Map<string, number>();
  let myVote: string | undefined;
  let nominatorNames = new Map<string, string>();

  if (activeCycle) {
    const { data: nominations, error } = await supabase
      .from("nominations")
      .select("id, user_id, book_id, title, author, pitch_note, status, created_at")
      .eq("cycle_id", activeCycle.id)
      .order("created_at");
    if (error) {
      return <p role="alert" className="rounded-xl bg-white p-5 text-red-700">Couldn't load nominations.</p>;
    }
    nominationRows = (nominations ?? []) as Nomination[];
    const ids = nominationRows.map((nomination) => nomination.id);
    if (ids.length > 0) {
      const [{ data: counts, error: countError }, { data: votes, error: voteError }] = await Promise.all([
        supabase.from("nomination_vote_counts").select("nomination_id, votes").in("nomination_id", ids),
        supabase.from("votes").select("nomination_id").eq("user_id", user.id).eq("cycle_id", activeCycle.id).maybeSingle(),
      ]);
      if (countError || voteError) {
        return <p role="alert" className="rounded-xl bg-white p-5 text-red-700">Couldn't load vote totals.</p>;
      }
      voteCounts = new Map((counts ?? []).map((count) => [count.nomination_id, count.votes]));
      myVote = votes?.nomination_id;
    }
    const userIds = [...new Set(nominationRows.map((nomination) => nomination.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, username").in("id", userIds);
      nominatorNames = new Map((profiles ?? []).map((entry) => [entry.id, entry.display_name ?? entry.username ?? "Member"]));
    }
  }

  const bookById = new Map((books ?? []).map((book) => [book.id, book]));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Book nominations & voting</h1>
          <p className="mt-1 text-sm opacity-70">Suggest a title and vote for the club's next read.</p>
        </div>
        {isAdmin && (
          <Link href="/admin/books" className="rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-black/10 hover:bg-white">
            Manage books
          </Link>
        )}
      </header>

      {isAdmin && <CreateCycleForm />}

      {cycleRows.length > 0 && (
        <nav className="flex flex-wrap gap-2" aria-label="Nomination cycles">
          {cycleRows.map((cycle) => (
            <Link
              key={cycle.id}
              href={`/nominations?cycle=${cycle.id}`}
              aria-current={activeCycle?.id === cycle.id ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm ring-1 ring-black/10 ${activeCycle?.id === cycle.id ? "bg-brand-500 font-semibold text-white" : "bg-white hover:bg-brand-50"}`}
            >
              {cycle.name} · {cycle.status}
            </Link>
          ))}
        </nav>
      )}

      {!activeCycle ? (
        <p className="rounded-xl bg-white p-5 text-sm ring-1 ring-black/5">
          No nomination cycles yet. {isAdmin ? "Open a cycle above to let members nominate and vote." : "An admin will open a cycle soon."}
        </p>
      ) : (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-black/5">
            <div>
              <h2 className="font-semibold">{activeCycle.name}</h2>
              <p className="text-sm opacity-70">{activeCycle.status === "open" ? "Nominations and voting are open." : "This cycle is closed."}</p>
            </div>
            {isAdmin && activeCycle.status === "open" && <AdminCycleActions cycleId={activeCycle.id} />}
          </section>

          {activeCycle.status === "open" && <NominationForm cycleId={activeCycle.id} />}

          {nominationRows.length === 0 ? (
            <p className="rounded-xl bg-white p-5 text-sm opacity-70 ring-1 ring-black/5">No books have been nominated in this cycle yet.</p>
          ) : (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Nominated books</h2>
              {nominationRows.map((nomination) => {
                const book = bookById.get(nomination.book_id);
                if (!book) return null;
                const canManageNomination =
                  isAdmin || (activeCycle.status === "open" && nomination.user_id === user.id);
                return (
                  <article key={nomination.id} className="flex flex-col gap-4 rounded-2xl bg-white p-4 ring-1 ring-black/5 sm:flex-row">
                    {book.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={book.cover_url} alt={`Cover of ${book.title}`} className="h-32 w-22 rounded-lg object-cover" />
                    ) : (
                      <div aria-hidden className="flex h-32 w-22 items-center justify-center rounded-lg bg-brand-50 text-3xl">📖</div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{nomination.title}</h3>
                          <p className="text-sm opacity-70">by {nomination.author}</p>
                        </div>
                        {nomination.status === "selected" && <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">Selected</span>}
                      </div>
                      {nomination.pitch_note && <p className="whitespace-pre-wrap text-sm">{nomination.pitch_note}</p>}
                      <p className="text-xs opacity-60">Nominated by {nominatorNames.get(nomination.user_id) ?? "Member"} · {book.total_chapters} chapters</p>
                      <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-3">
                        <span className="text-sm font-semibold">{voteCounts.get(nomination.id) ?? 0} votes</span>
                        {activeCycle.status === "open" && <VoteButton nominationId={nomination.id} voted={myVote === nomination.id} />}
                        {isAdmin && activeCycle.status === "open" && <FinalizeButton cycleId={activeCycle.id} nominationId={nomination.id} />}
                      </div>
                      {canManageNomination && (
                        <NominationEditControls
                          nominationId={nomination.id}
                          title={nomination.title}
                          author={nomination.author}
                          pitchNote={nomination.pitch_note}
                        />
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}
