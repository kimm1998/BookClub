import { redirect } from "next/navigation";
import { AddBookForm, BookEditor } from "@/components/book-admin-forms";
import { createClient } from "@/lib/supabase/server";

type Book = {
  id: string;
  title: string;
  author: string;
  total_chapters: number;
  cover_url: string | null;
  description: string | null;
  status: "active_club_read" | "completed" | "upcoming" | "catalog";
};

export default async function AdminBooksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, author, total_chapters, cover_url, description, status")
    .order("title");
  if (error) {
    return <p role="alert" className="rounded-xl bg-white p-5 text-red-700">Couldn't load the book catalog.</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Manage club books</h1>
        <p className="mt-1 text-sm opacity-70">Add titles, maintain chapter counts, and choose the active club read.</p>
      </header>
      <AddBookForm />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Book catalog ({books?.length ?? 0})</h2>
        {books?.length ? (
          <div className="space-y-4">
            {(books as Book[]).map((book) => <BookEditor key={book.id} book={book} />)}
          </div>
        ) : (
          <p className="rounded-xl bg-white p-5 text-sm opacity-70 ring-1 ring-black/5">No books yet. Add one above.</p>
        )}
      </section>
    </div>
  );
}
