import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BookClub",
  description: "Read together, spoiler-free.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
