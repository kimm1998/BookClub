import { redirect } from "next/navigation";
import { CreateInviteForm, RemoveForm, RevokeForm, RoleForm } from "@/components/member-admin-forms";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const [{ data: members, error }, { data: invites }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, role, created_at").order("created_at"),
    supabase
      .from("invite_codes")
      .select("code, role, note, max_uses, uses, expires_at, revoked, created_at")
      .order("created_at", { ascending: false }),
  ]);
  if (error) {
    return <p role="alert" className="rounded-xl bg-white p-5 text-red-700">Couldn't load members.</p>;
  }

  const now = Date.now();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Members &amp; invites</h1>
        <p className="mt-1 text-sm opacity-70">
          Signup requires an invite code. An admin code makes the new account an admin.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Invite codes</h2>
        <CreateInviteForm />
        {invites?.length ? (
          <ul className="space-y-2">
            {invites.map((i) => {
              const expired = !!i.expires_at && new Date(i.expires_at).getTime() <= now;
              const used = i.uses >= i.max_uses;
              const inactive = i.revoked || expired || used;
              return (
                <li
                  key={i.code}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-black/5"
                >
                  <div className={inactive ? "opacity-50" : ""}>
                    <code className="text-base font-semibold tracking-wider">{i.code}</code>
                    <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{i.role}</span>
                    <p className="text-xs opacity-70">
                      {i.uses}/{i.max_uses} used
                      {i.expires_at && ` · expires ${new Date(i.expires_at).toLocaleDateString()}`}
                      {i.note && ` · ${i.note}`}
                      {i.revoked ? " · revoked" : expired ? " · expired" : used ? " · fully used" : ""}
                    </p>
                  </div>
                  {!inactive && <RevokeForm code={i.code} />}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm opacity-70">No invite codes yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Members ({members?.length ?? 0})</h2>
        <ul className="space-y-2">
          {members?.map((m) => {
            const name = m.display_name || m.username;
            return (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-black/5"
              >
                <div>
                  <p className="font-medium">
                    {name} <span className="text-sm font-normal opacity-60">@{m.username}</span>
                    <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{m.role}</span>
                    {m.id === user.id && <span className="ml-2 text-xs opacity-60">(you)</span>}
                  </p>
                  <p className="text-xs opacity-70">Joined {new Date(m.created_at).toLocaleDateString()}</p>
                </div>
                {m.id !== user.id && (
                  <div className="flex items-start gap-2">
                    <RoleForm userId={m.id} role={m.role} />
                    <RemoveForm userId={m.id} name={name} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
