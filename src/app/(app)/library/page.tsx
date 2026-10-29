import { createClient } from "@/lib/supabase/server";
import { LibraryBookForm } from "@/components/library-book-form";

type UserBook = {
  id: string;
  book_id: string;
  status: "reading" | "completed" | "want_to_read";
  current_chapter: number;
  rating: number | null;
  notes: string | null;
};

const shelves = [
  { key: "reading", label: "Currently reading" },
  { key: "completed", label: "Completed" },
  { key: "want_to_read", label: "Want to read" },
] as const;

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: books, error: booksError }, { data: userBooks, error: userBooksError }] =
    await Promise.all([
      supabase
        .from("books")
        .select("id, title, author, cover_url, total_chapters")
        .order("title"),
      supabase
        .from("user_books")
        .select("id, book_id, status, current_chapter, rating, notes")
        .eq("user_id", user.id),
    ]);

  if (booksError || userBooksError) {
    return <p role="alert" className="rounded-xl bg-white p-5 text-red-700">Couldn't load your library.</p>;
  }

  const entries = (userBooks ?? []) as UserBook[];
  const entryByBook = new Map(entries.map((entry) => [entry.book_id, entry]));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold">My library</h1>
        <p className="mt-1 text-sm opacity-70">Keep your shelves, ratings, and private reading notes in one place.</p>
      </header>

      {shelves.map((shelf) => {
        const shelfEntries = entries.filter((entry) => entry.status === shelf.key);
        return (
          <section key={shelf.key} className="space-y-4">
            <h2 className="text-lg font-semibold">{shelf.label} <span className="text-sm font-normal opacity-60">({shelfEntries.length})</span></h2>
            {shelfEntries.length === 0 ? (
              <p className="rounded-xl bg-white p-4 text-sm opacity-70 ring-1 ring-black/5">No books on this shelf yet.</p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {shelfEntries.map((entry) => {
                  const book = books?.find((item) => item.id === entry.book_id);
                  if (!book) return null;
                  return (
                    <article key={entry.id} className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
                      <div className="flex gap-4">
                        {book.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={book.cover_url} alt={`Cover of ${book.title}`} className="h-28 w-20 rounded-lg object-cover" />
                        ) : (
                          <div aria-hidden className="flex h-28 w-20 items-center justify-center rounded-lg bg-brand-50 text-3xl">📖</div>
                        )}
                        <div>
                          <h3 className="font-semibold">{book.title}</h3>
                          <p className="text-sm opacity-70">by {book.author}</p>
                          {entry.status === "reading" && (
                            <p className="mt-2 text-xs opacity-70">Chapter {entry.current_chapter} of {book.total_chapters}</p>
                          )}
                        </div>
                      </div>
                      <LibraryBookForm
                        bookId={book.id}
                        status={entry.status}
                        rating={entry.rating}
                        notes={entry.notes}
                      />
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Browse books</h2>
        {(books ?? []).filter((book) => !entryByBook.has(book.id)).length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm opacity-70 ring-1 ring-black/5">You have added every book in the club catalog.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {(books ?? []).filter((book) => !entryByBook.has(book.id)).map((book) => (
              <article key={book.id} className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <div className="flex gap-4">
                  {book.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.cover_url} alt={`Cover of ${book.title}`} className="h-28 w-20 rounded-lg object-cover" />
                  ) : (
                    <div aria-hidden className="flex h-28 w-20 items-center justify-center rounded-lg bg-brand-50 text-3xl">📖</div>
                  )}
                  <div>
                    <h3 className="font-semibold">{book.title}</h3>
                    <p className="text-sm opacity-70">by {book.author}</p>
                    <p className="mt-2 text-xs opacity-70">{book.total_chapters} chapters</p>
                  </div>
                </div>
                <LibraryBookForm bookId={book.id} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
