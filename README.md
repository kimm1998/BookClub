# BookClub

A multi-user book club web app built with Next.js (App Router), React, Tailwind CSS and Supabase.

## Roadmap
1. Schema, RLS and seed data (this commit)
2. Project structure and Supabase client setup (+ storage buckets)
3. Auth and protected layout
4. Dashboard
5. Progress and spoiler shield
6. Library, discussions, nominations and voting

## Database setup
1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL Editor.
3. Sign up once in the app, then edit the email in `supabase/seed.sql` and run it to become admin and load sample data.
