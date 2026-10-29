-- Invite-only signup, admin-by-invite, and member management

create table public.invite_codes (
  code text primary key,
  role text not null default 'member' check (role in ('admin','member')),
  note text,
  max_uses int not null default 1 check (max_uses > 0),
  uses int not null default 0,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.invite_codes enable row level security;
create policy "invites admin" on public.invite_codes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Pre-check used by the signup form (anon-callable, reveals only valid/invalid)
create or replace function public.check_invite(p_code text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.invite_codes
    where code = upper(trim(p_code)) and not revoked and uses < max_uses
      and (expires_at is null or expires_at > now())
  );
$$;
grant execute on function public.check_invite(text) to anon, authenticated;

-- Enforce the invite at the database level; the code decides the role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role text;
begin
  update public.invite_codes
     set uses = uses + 1
   where code = upper(trim(coalesce(new.raw_user_meta_data->>'invite_code','')))
     and not revoked and uses < max_uses
     and (expires_at is null or expires_at > now())
  returning role into v_role;

  if v_role is null then
    raise exception 'A valid invite code is required';
  end if;

  insert into public.profiles (id, username, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1) || '_' || substr(new.id::text,1,4)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    v_role
  );
  return new;
end $$;

-- Change a member's role, never leaving the club without an admin
create or replace function public.set_member_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can change roles'; end if;
  if p_role not in ('admin','member') then raise exception 'Invalid role'; end if;
  if p_role = 'member'
     and (select role from public.profiles where id = p_user) = 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'The club needs at least one admin';
  end if;
  update public.profiles set role = p_role where id = p_user;
end $$;
grant execute on function public.set_member_role(uuid, text) to authenticated;

-- Remove a member entirely (auth user + profile + their data)
create or replace function public.remove_member(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can remove members'; end if;
  if p_user = auth.uid() then raise exception 'You cannot remove yourself'; end if;
  delete from auth.users where id = p_user;
end $$;
grant execute on function public.remove_member(uuid) to authenticated;
