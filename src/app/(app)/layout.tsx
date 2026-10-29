import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { NavLinks } from "@/components/nav-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, role")
    .eq("id", user.id)
    .single();

  const name = profile?.display_name ?? profile?.username ?? "Reader";
  const isAdmin = profile?.role === "admin";

  const logoutForm = (
    <form action={logout}>
      <button className="text-sm font-medium text-brand-600 underline">Log out</button>
    </form>
  );

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-black/10 bg-white p-4 md:flex">
        <div>
          <Link href="/dashboard" className="mb-6 block text-xl font-bold text-brand-700">
            📚 BookClub
          </Link>
          <nav className="space-y-1" aria-label="Main">
            <NavLinks variant="side" isAdmin={isAdmin} />
          </nav>
        </div>
        <div className="space-y-2 border-t border-black/10 pt-4">
          <p className="truncate text-sm font-medium">{name}</p>
          {isAdmin && (
            <span className="inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
              Admin
            </span>
          )}
          <div>{logoutForm}</div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-black/10 bg-white p-4 md:hidden">
        <span className="text-lg font-bold text-brand-700">📚 BookClub</span>
        <div className="flex items-center gap-3">
          <span className="max-w-28 truncate text-sm">{name}</span>
          {logoutForm}
        </div>
      </header>

      <main className="flex-1 p-4 pb-24 md:p-8">{children}</main>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-black/10 bg-white md:hidden"
      >
        <NavLinks variant="tabs" isAdmin={isAdmin} />
      </nav>
    </div>
  );
}
