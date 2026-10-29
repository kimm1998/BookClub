"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/book", label: "Reading", icon: "📖" },
  { href: "/library", label: "Library", icon: "📚" },
  { href: "/discussions", label: "Discussions", icon: "💬" },
  { href: "/nominations", label: "Vote", icon: "🗳️" },
];

export function NavLinks({ variant, isAdmin = false }: { variant: "side" | "tabs"; isAdmin?: boolean }) {
  const pathname = usePathname();
  const visibleLinks = isAdmin
    ? [
        ...links,
        { href: "/admin/books", label: "Manage books", icon: "⚙️" },
        { href: "/admin/schedule", label: "Schedule", icon: "🗓️" },
        { href: "/admin/members", label: "Members", icon: "👥" },
      ]
    : links;

  return (
    <>
      {visibleLinks.map((l) => {
        const active = pathname.startsWith(l.href);
        const base =
          variant === "side"
            ? "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition"
            : "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium";
        const state = active
          ? "bg-brand-50 text-brand-700"
          : "text-ink/70 hover:bg-brand-50 hover:text-brand-700";
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`${base} ${state}`}>
            <span aria-hidden>{l.icon}</span>
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
