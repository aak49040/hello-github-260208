-- Run this in the Supabase SQL Editor for your project.
-- Creates a `posts` table with Row Level Security so the public anon key
-- is safe to use from the browser.

create table if not exists public.posts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Display name only. Never store email addresses here: every logged-in
  -- user can read this table.
  author_name text check (char_length(author_name) <= 50),
  content     text not null check (char_length(content) between 1 and 280),
  created_at  timestamptz not null default now()
);

create index if not exists posts_created_at_idx
  on public.posts (created_at desc);

-- Row Level Security: without this, anyone with the anon key could read and
-- modify every row.
alter table public.posts enable row level security;

-- Only logged-in users can read posts. Anonymous anon-key requests get nothing.
drop policy if exists "Posts are readable by authenticated users" on public.posts;
create policy "Posts are readable by authenticated users"
  on public.posts
  for select
  to authenticated
  using (true);

-- Logged-in users can only insert posts as themselves.
drop policy if exists "Users can insert their own posts" on public.posts;
create policy "Users can insert their own posts"
  on public.posts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can delete their own posts (not used by the UI yet).
drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- No UPDATE policy: posts cannot be edited by anyone through the API.

-- Enable realtime so new posts appear without reloading.
-- (Running this twice raises "already member of publication"; that is harmless.)
alter publication supabase_realtime add table public.posts;
