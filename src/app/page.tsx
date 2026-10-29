import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: book } = await supabase
    .from("books")
    .select("title, author, total_chapters")
    .eq("status", "active_club_read")
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold text-brand-700">BookClub</h1>
      <p className="mt-2">Supabase connection is working.</p>
      {book ? (
        <p className="mt-4">
          Current read: <strong>{book.title}</strong> by {book.author} ({book.total_chapters} chapters)
        </p>
      ) : (
        <p className="mt-4 text-sm opacity-70">No active book yet. Run supabase/seed.sql.</p>
      )}
    </main>
  );
}
