-- Store nomination details separately from the shared book catalog record.
alter table public.nominations
  add column title text,
  add column author text;

update public.nominations n
   set title = b.title,
       author = b.author
  from public.books b
 where b.id = n.book_id;

alter table public.nominations
  alter column title set not null,
  alter column author set not null;

-- Mutations go through these functions so ownership and editable fields are
-- enforced even when requests are made directly against Supabase.
drop policy if exists "thoughts update" on public.chapter_thoughts;
drop policy if exists "thoughts delete" on public.chapter_thoughts;
drop policy if exists "topics admin" on public.discussion_topics;
drop policy if exists "comments update" on public.topic_comments;
drop policy if exists "comments delete" on public.topic_comments;
drop policy if exists "nom admin update" on public.nominations;
drop policy if exists "nom delete" on public.nominations;

create policy "topics admin insert" on public.discussion_topics for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid());

create or replace function public.edit_chapter_thought(
  p_thought uuid,
  p_content text,
  p_sentiment text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  author_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_content)) not between 1 and 2000 then raise exception 'Thought must be 1-2000 characters'; end if;
  if p_sentiment is not null and p_sentiment not in ('loved','liked','confused','shocked','bored','theory') then
    raise exception 'Invalid mood';
  end if;

  select user_id into author_id from public.chapter_thoughts where id = p_thought;
  if not found then raise exception 'Thought not found'; end if;
  if author_id <> auth.uid() and not public.is_admin() then raise exception 'You cannot edit this thought'; end if;

  update public.chapter_thoughts
     set content = trim(p_content), sentiment_tag = p_sentiment
   where id = p_thought;
end $$;

create or replace function public.delete_chapter_thought(p_thought uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  author_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select user_id into author_id from public.chapter_thoughts where id = p_thought;
  if not found then raise exception 'Thought not found'; end if;
  if author_id <> auth.uid() and not public.is_admin() then raise exception 'You cannot delete this thought'; end if;
  delete from public.chapter_thoughts where id = p_thought;
end $$;

create or replace function public.edit_discussion_topic(
  p_topic uuid,
  p_title text,
  p_prompt_body text,
  p_category text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can edit discussion prompts'; end if;
  if char_length(trim(p_title)) not between 3 and 120 then raise exception 'Title must be 3-120 characters'; end if;
  if char_length(trim(p_prompt_body)) not between 1 and 3000 then raise exception 'Prompt must be 1-3000 characters'; end if;
  if char_length(trim(p_category)) not between 1 and 40 then raise exception 'Invalid category'; end if;
  update public.discussion_topics
     set title = trim(p_title), prompt_body = trim(p_prompt_body), category = trim(p_category)
   where id = p_topic;
  if not found then raise exception 'Discussion prompt not found'; end if;
end $$;

create or replace function public.delete_discussion_topic(p_topic uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can delete discussion prompts'; end if;
  delete from public.discussion_topics where id = p_topic;
  if not found then raise exception 'Discussion prompt not found'; end if;
end $$;

create or replace function public.edit_topic_comment(p_comment uuid, p_content text)
returns void language plpgsql security definer set search_path = public as $$
declare
  author_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_content)) not between 1 and 2000 then raise exception 'Reply must be 1-2000 characters'; end if;
  select user_id into author_id from public.topic_comments where id = p_comment;
  if not found then raise exception 'Reply not found'; end if;
  if author_id <> auth.uid() and not public.is_admin() then raise exception 'You cannot edit this reply'; end if;
  update public.topic_comments set content = trim(p_content) where id = p_comment;
end $$;

create or replace function public.delete_topic_comment(p_comment uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  author_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select user_id into author_id from public.topic_comments where id = p_comment;
  if not found then raise exception 'Reply not found'; end if;
  if author_id <> auth.uid() and not public.is_admin() then raise exception 'You cannot delete this reply'; end if;
  delete from public.topic_comments where id = p_comment;
end $$;

create or replace function public.edit_nomination(
  p_nomination uuid,
  p_title text,
  p_author text,
  p_pitch_note text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  nom_user uuid;
  nom_cycle uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_title)) not between 1 and 200 then raise exception 'Title must be 1–200 characters'; end if;
  if char_length(trim(p_author)) not between 1 and 200 then raise exception 'Author must be 1–200 characters'; end if;
  if p_pitch_note is not null and char_length(trim(p_pitch_note)) > 1000 then raise exception 'Pitch must be at most 1000 characters'; end if;

  select user_id, cycle_id into nom_user, nom_cycle
    from public.nominations where id = p_nomination;
  if not found then raise exception 'Nomination not found'; end if;
  if nom_user <> auth.uid() and not public.is_admin() then raise exception 'You cannot edit this nomination'; end if;
  if nom_user = auth.uid() and not public.is_admin()
     and not exists (select 1 from public.nomination_cycles where id = nom_cycle and status = 'open') then
    raise exception 'This nomination cycle is closed';
  end if;

  update public.nominations
     set title = trim(p_title),
         author = trim(p_author),
         pitch_note = nullif(trim(coalesce(p_pitch_note, '')), '')
   where id = p_nomination;
end $$;

create or replace function public.delete_nomination(p_nomination uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  nom_user uuid;
  nom_cycle uuid;
  nom_book uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select user_id, cycle_id, book_id into nom_user, nom_cycle, nom_book
    from public.nominations where id = p_nomination for update;
  if not found then raise exception 'Nomination not found'; end if;
  if nom_user <> auth.uid() and not public.is_admin() then raise exception 'You cannot delete this nomination'; end if;
  if nom_user = auth.uid() and not public.is_admin()
     and not exists (select 1 from public.nomination_cycles where id = nom_cycle and status = 'open') then
    raise exception 'This nomination cycle is closed';
  end if;

  delete from public.nominations where id = p_nomination;

  -- Remove only an unused placeholder book created by this nominator.
  delete from public.books b
   where b.id = nom_book
     and b.status = 'upcoming'
     and b.created_by = nom_user
     and not exists (select 1 from public.nominations where book_id = nom_book)
     and not exists (select 1 from public.user_books where book_id = nom_book)
     and not exists (select 1 from public.chapter_thoughts where book_id = nom_book)
     and not exists (select 1 from public.discussion_topics where book_id = nom_book)
     and not exists (select 1 from public.reading_schedules where book_id = nom_book);
end $$;

revoke all on function public.edit_chapter_thought(uuid,text,text) from public, anon;
revoke all on function public.delete_chapter_thought(uuid) from public, anon;
revoke all on function public.edit_discussion_topic(uuid,text,text,text) from public, anon;
revoke all on function public.delete_discussion_topic(uuid) from public, anon;
revoke all on function public.edit_topic_comment(uuid,text) from public, anon;
revoke all on function public.delete_topic_comment(uuid) from public, anon;
revoke all on function public.edit_nomination(uuid,text,text,text) from public, anon;
revoke all on function public.delete_nomination(uuid) from public, anon;

grant execute on function public.edit_chapter_thought(uuid,text,text) to authenticated;
grant execute on function public.delete_chapter_thought(uuid) to authenticated;
grant execute on function public.edit_discussion_topic(uuid,text,text,text) to authenticated;
grant execute on function public.delete_discussion_topic(uuid) to authenticated;
grant execute on function public.edit_topic_comment(uuid,text) to authenticated;
grant execute on function public.delete_topic_comment(uuid) to authenticated;
grant execute on function public.edit_nomination(uuid,text,text,text) to authenticated;
grant execute on function public.delete_nomination(uuid) to authenticated;
