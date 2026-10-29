create or replace function public.cast_nomination_vote(p_nomination_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  voter_id uuid := auth.uid();
  target_cycle uuid;
begin
  if voter_id is null then
    raise exception 'Authentication required';
  end if;

  select n.cycle_id
    into target_cycle
    from public.nominations n
    join public.nomination_cycles c on c.id = n.cycle_id
   where n.id = p_nomination_id
     and c.status = 'open';

  if target_cycle is null then
    raise exception 'This nomination cycle is closed or does not exist';
  end if;

  delete from public.votes
   where user_id = voter_id
     and cycle_id = target_cycle;

  insert into public.votes (user_id, nomination_id, cycle_id)
  values (voter_id, p_nomination_id, target_cycle);
end;
$$;

create or replace function public.set_active_club_book(p_book_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change the active club book';
  end if;

  if not exists (select 1 from public.books where id = p_book_id) then
    raise exception 'Book does not exist';
  end if;

  update public.books
     set status = 'completed'
   where status = 'active_club_read'
     and id <> p_book_id;

  update public.books
     set status = 'active_club_read'
   where id = p_book_id;
end;
$$;

create or replace function public.finalize_nomination_cycle(
  p_cycle_id uuid,
  p_nomination_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_book uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can finalize a nomination cycle';
  end if;

  if not exists (
    select 1
      from public.nomination_cycles
     where id = p_cycle_id
       and status = 'open'
  ) then
    raise exception 'Nomination cycle is not open';
  end if;

  select book_id
    into selected_book
    from public.nominations
   where id = p_nomination_id
     and cycle_id = p_cycle_id;

  if selected_book is null then
    raise exception 'The selected nomination is not in this cycle';
  end if;

  update public.books
     set status = 'completed'
   where status = 'active_club_read'
     and id <> selected_book;

  update public.books
     set status = 'active_club_read'
   where id = selected_book;

  update public.nominations
     set status = case when id = p_nomination_id then 'selected' else 'pending' end
   where cycle_id = p_cycle_id;

  update public.nomination_cycles
     set status = 'closed',
         closes_at = now()
   where id = p_cycle_id;
end;
$$;

revoke all on function public.cast_nomination_vote(uuid) from public, anon;
revoke all on function public.set_active_club_book(uuid) from public, anon;
revoke all on function public.finalize_nomination_cycle(uuid, uuid) from public, anon;
grant execute on function public.cast_nomination_vote(uuid) to authenticated;
grant execute on function public.set_active_club_book(uuid) to authenticated;
grant execute on function public.finalize_nomination_cycle(uuid, uuid) to authenticated;
