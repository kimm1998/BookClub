-- Storage buckets: avatars (per-user folder) and covers (manual book covers)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('covers', 'covers', true)
on conflict (id) do nothing;

-- Avatars: files must live in a folder named after the user's id: <uid>/file.png
create policy "avatars public read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Covers: any member can upload; only admins can replace or delete
create policy "covers public read" on storage.objects for select
  using (bucket_id = 'covers');
create policy "covers member insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers');
create policy "covers admin update" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and public.is_admin());
create policy "covers admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and public.is_admin());
