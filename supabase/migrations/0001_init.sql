-- ============ EXTENSIONS ============
create extension if not exists "pgcrypto";

-- ============ HELPERS ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- is_admin(): SECURITY DEFINER avoids RLS recursion on profiles
create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1) || '_' || substr(new.id::text,1,4)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1))
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Block role self-escalation (SQL editor has auth.uid() = null, so you can still promote yourself there)
create or replace function public.protect_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end $$;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role();

-- ============ BOOKS ============
create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  cover_url text,
  description text,
  total_chapters int not null default 1 check (total_chapters > 0),
  google_books_id text,
  status text not null default 'catalog'
    check (status in ('active_club_read','completed','upcoming','catalog')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- only ONE active club read
create unique index one_active_club_read on public.books ((status)) where status = 'active_club_read';
create trigger books_updated before update on public.books
  for each row execute function public.set_updated_at();

-- ============ USER BOOKS (personal library) ============
create table public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  status text not null default 'want_to_read' check (status in ('reading','completed','want_to_read')),
  current_chapter int not null default 0 check (current_chapter >= 0),
  rating smallint check (rating between 1 and 5),
  notes text,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);
create index on public.user_books (book_id);
create trigger user_books_updated before update on public.user_books
  for each row execute function public.set_updated_at();

-- ============ READING SCHEDULES ============
create table public.reading_schedules (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  target_chapter int not null check (target_chapter > 0),
  target_date date not null,
  unique (book_id, target_chapter)
);

-- ============ CHAPTER THOUGHTS ============
create table public.chapter_thoughts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_number int not null check (chapter_number > 0),
  content text not null check (char_length(content) between 1 and 2000),
  sentiment_tag text check (sentiment_tag in ('loved','liked','confused','shocked','bored','theory')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.chapter_thoughts (book_id, chapter_number);
create trigger chapter_thoughts_updated before update on public.chapter_thoughts
  for each row execute function public.set_updated_at();

create table public.thought_reactions (
  id uuid primary key default gen_random_uuid(),
  thought_id uuid not null references public.chapter_thoughts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('❤️','😂','😮','😢','🔥','👍')),
  created_at timestamptz not null default now(),
  unique (thought_id, user_id, emoji)
);

-- ============ DISCUSSION TOPICS ============
create table public.discussion_topics (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  prompt_body text not null,
  category text not null default 'general',
  created_at timestamptz not null default now()
);
create table public.topic_comments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.discussion_topics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index on public.topic_comments (topic_id);

-- ============ NOMINATIONS & VOTING ============
create table public.nomination_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  status text not null default 'open' check (status in ('open','closed')),
  opens_at timestamptz not null default now(),
  closes_at timestamptz
);
create table public.nominations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  cycle_id uuid not null references public.nomination_cycles(id) on delete cascade,
  pitch_note text,
  status text not null default 'pending' check (status in ('pending','shortlisted','selected')),
  created_at timestamptz not null default now(),
  unique (cycle_id, book_id)
);
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  nomination_id uuid not null references public.nominations(id) on delete cascade,
  cycle_id uuid not null references public.nomination_cycles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, nomination_id),
  unique (user_id, cycle_id)            -- one vote per user per cycle (delete + re-vote to change)
);
-- fill cycle_id automatically and block voting in closed cycles
create or replace function public.votes_set_cycle()
returns trigger language plpgsql security definer set search_path = public as $$
declare c uuid; s text;
begin
  select n.cycle_id, cy.status into c, s from nominations n
    join nomination_cycles cy on cy.id = n.cycle_id where n.id = new.nomination_id;
  if s <> 'open' then raise exception 'Voting is closed'; end if;
  new.cycle_id := c; return new;
end $$;
create trigger votes_cycle before insert on public.votes
  for each row execute function public.votes_set_cycle();

-- Public vote counts (no voter identities)
create view public.nomination_vote_counts as
  select n.id as nomination_id, count(v.id)::int as votes
  from public.nominations n left join public.votes v on v.nomination_id = n.id
  group by n.id;

-- ============ SPOILER-SAFE RPCs ============
-- Thoughts for a chapter; content is NULL when the reader hasn't reached that chapter.
create or replace function public.get_chapter_thoughts(p_book uuid, p_chapter int)
returns table (id uuid, user_id uuid, display_name text, avatar_url text,
               chapter_number int, content text, sentiment_tag text,
               created_at timestamptz, is_locked boolean)
language sql security definer stable set search_path = public as $$
  with me as (
    select coalesce(
      (select case when ub.status = 'completed' then 100000 else ub.current_chapter end
         from user_books ub where ub.user_id = auth.uid() and ub.book_id = p_book), 0) as progress
  )
  select t.id, t.user_id, p.display_name, p.avatar_url, t.chapter_number,
         case when t.user_id = auth.uid() or t.chapter_number <= me.progress then t.content end,
         t.sentiment_tag, t.created_at,
         not (t.user_id = auth.uid() or t.chapter_number <= me.progress)
  from chapter_thoughts t join profiles p on p.id = t.user_id, me
  where t.book_id = p_book and t.chapter_number = p_chapter and auth.uid() is not null
  order by t.created_at;
$$;

-- Explicit "Reveal Spoiler": returns content of ONE locked thought on user request
create or replace function public.reveal_thought(p_thought uuid)
returns text language sql security definer stable set search_path = public as $$
  select content from chapter_thoughts where id = p_thought and auth.uid() is not null;
$$;

-- Group progress (visible to members)
create or replace view public.book_progress as
  select ub.book_id, ub.user_id, p.display_name, p.avatar_url,
         ub.current_chapter, ub.status, b.total_chapters,
         round(100.0 * ub.current_chapter / b.total_chapters) as pct,
         ub.updated_at
  from user_books ub join profiles p on p.id = ub.user_id join books b on b.id = ub.book_id
  where ub.status in ('reading','completed');

-- ============ RLS ============
alter table public.profiles          enable row level security;
alter table public.books             enable row level security;
alter table public.user_books        enable row level security;
alter table public.reading_schedules enable row level security;
alter table public.chapter_thoughts  enable row level security;
alter table public.thought_reactions enable row level security;
alter table public.discussion_topics enable row level security;
alter table public.topic_comments    enable row level security;
alter table public.nomination_cycles enable row level security;
alter table public.nominations       enable row level security;
alter table public.votes             enable row level security;

-- profiles
create policy "profiles read"   on public.profiles for select to authenticated using (true);
create policy "profiles update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- books: everyone reads; members add (catalog/upcoming via nomination); admin manages
create policy "books read"   on public.books for select to authenticated using (true);
create policy "books insert" on public.books for insert to authenticated
  with check (public.is_admin() or (status in ('catalog','upcoming') and created_by = auth.uid()));
create policy "books update" on public.books for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "books delete" on public.books for delete to authenticated using (public.is_admin());

-- user_books: own rows only (group progress goes through book_progress view)
create policy "ub own all" on public.user_books for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- schedules
create policy "sched read"  on public.reading_schedules for select to authenticated using (true);
create policy "sched admin" on public.reading_schedules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- chapter_thoughts: direct table access = own only; others read via get_chapter_thoughts()
create policy "thoughts own select" on public.chapter_thoughts for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "thoughts insert" on public.chapter_thoughts for insert to authenticated
  with check (user_id = auth.uid());
create policy "thoughts update" on public.chapter_thoughts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "thoughts delete" on public.chapter_thoughts for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- reactions
create policy "react read"   on public.thought_reactions for select to authenticated using (true);
create policy "react insert" on public.thought_reactions for insert to authenticated with check (user_id = auth.uid());
create policy "react delete" on public.thought_reactions for delete to authenticated using (user_id = auth.uid());

-- topics: admin writes, everyone reads
create policy "topics read"  on public.discussion_topics for select to authenticated using (true);
create policy "topics admin" on public.discussion_topics for all to authenticated
  using (public.is_admin()) with check (public.is_admin() and created_by = auth.uid());

-- comments
create policy "comments read"   on public.topic_comments for select to authenticated using (true);
create policy "comments insert" on public.topic_comments for insert to authenticated with check (user_id = auth.uid());
create policy "comments update" on public.topic_comments for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "comments delete" on public.topic_comments for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- cycles: admin manages
create policy "cycles read"  on public.nomination_cycles for select to authenticated using (true);
create policy "cycles admin" on public.nomination_cycles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- nominations: members nominate in open cycles; admin changes status
create policy "nom read" on public.nominations for select to authenticated using (true);
create policy "nom insert" on public.nominations for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending'
    and exists (select 1 from public.nomination_cycles c where c.id = cycle_id and c.status = 'open'));
create policy "nom admin update" on public.nominations for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "nom delete" on public.nominations for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- votes: see only your own; counts via view
create policy "votes own read" on public.votes for select to authenticated using (user_id = auth.uid());
create policy "votes insert"   on public.votes for insert to authenticated with check (user_id = auth.uid());
create policy "votes delete"   on public.votes for delete to authenticated using (user_id = auth.uid());

grant select on public.nomination_vote_counts, public.book_progress to authenticated;
grant execute on function public.get_chapter_thoughts(uuid,int), public.reveal_thought(uuid) to authenticated;
revoke execute on function public.get_chapter_thoughts(uuid,int), public.reveal_thought(uuid) from anon;

-- ============ REALTIME ============
alter publication supabase_realtime add table public.user_books;
alter publication supabase_realtime add table public.chapter_thoughts;
