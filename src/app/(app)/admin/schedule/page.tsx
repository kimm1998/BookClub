import { redirect } from "next/navigation";
import { DeleteGoalForm, GoalForm } from "@/components/schedule-admin-forms";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const { data: book } = await supabase
    .from("books")
    .select("id, title, author, total_chapters")
    .eq("status", "active_club_read")
    .maybeSingle();

  if (!book) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-5 ring-1 ring-black/5">
        <h1 className="text-2xl font-bold">Reading schedule</h1>
        <p className="mt-2 text-sm opacity-70">
          There is no active club read. Activate a book under Manage books first.
        </p>
      </div>
    );
  }

  const { data: goals } = await supabase
    .from("reading_schedules")
    .select("id, target_chapter, target_date")
    .eq("book_id", book.id)
    .order("target_chapter");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Reading schedule</h1>
        <p className="mt-1 text-sm opacity-70">
          Goals for <strong>{book.title}</strong> ({book.total_chapters} chapters). The dashboard shows the next upcoming goal.
        </p>
      </header>
      <GoalForm bookId={book.id} maxChapter={book.total_chapters} />
      {goals?.length ? (
        <ul className="space-y-2">
          {goals.map((g) => (
            <li key={g.id} className="flex items-center justify-between rounded-xl bg-white p-3 ring-1 ring-black/5">
              <span>
                Chapter <strong>{g.target_chapter}</strong> by{" "}
                <strong>{new Date(`${g.target_date}T00:00:00`).toLocaleDateString()}</strong>
              </span>
              <DeleteGoalForm id={g.id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm opacity-70">No goals yet. Add one above.</p>
      )}
    </div>
  );
}
