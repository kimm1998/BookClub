# BookClub

A multi-user book club web app built with Next.js (App Router), React, Tailwind CSS and Supabase.

## Roadmap
1. Schema, RLS and seed data (this commit)
2. Project structure and Supabase client setup (+ storage buckets)
3. Auth and protected layout
4. Dashboard
5. Progress and spoiler shield
6. Library and discussions
7. Nominations, voting and admin book management

## Database setup
1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` through `0004_invites_members.sql` in order in the SQL Editor. Signup is invite-only: admins create codes (member or admin) under **Members**.
3. Sign up once in the app, then edit the email in `supabase/seed.sql` and run it to become admin and load sample data.

Admins can manage the catalog from **Manage books**, open nomination cycles from **Vote**, and finalize a nomination to make its book the active read. Members can search Google Books while nominating; chapter counts can be corrected in the admin book manager before a title is selected.
