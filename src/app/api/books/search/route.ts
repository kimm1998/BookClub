import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.string().trim().min(2).max(100);

type GoogleBook = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

export async function GET(request: Request) {
  const query = querySchema.safeParse(new URL(request.url).searchParams.get("q") ?? "");
  if (!query.success) {
    return NextResponse.json({ error: "Enter at least 2 characters to search." }, { status: 400 });
  }

  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query.data);
  url.searchParams.set("maxResults", "8");
  url.searchParams.set("printType", "books");

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) {
    return NextResponse.json({ error: "Book search is temporarily unavailable." }, { status: 502 });
  }

  const payload = (await response.json()) as { items?: GoogleBook[] };
  const results = (payload.items ?? [])
    .filter((item) => item.volumeInfo?.title)
    .map((item) => {
      const cover = item.volumeInfo?.imageLinks?.thumbnail ?? item.volumeInfo?.imageLinks?.smallThumbnail;
      return {
        googleBooksId: item.id,
        title: item.volumeInfo?.title ?? "",
        author: item.volumeInfo?.authors?.join(", ") ?? "Unknown author",
        description: item.volumeInfo?.description ?? "",
        coverUrl: cover?.replace(/^http:/, "https:") ?? "",
      };
    });

  return NextResponse.json({ results });
}
