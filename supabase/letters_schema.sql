-- Letters module — Supabase schema
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).
--
-- Access model: like the rest of the app since couple_sharing.sql, Letters
-- is shared between exactly two accounts (a couple) rather than
-- private-per-user — both people can read every letter, but each person can
-- only write/delete their own. Since signup is open to anyone, access is
-- locked to a hardcoded email allowlist rather than "any signed-in user" —
-- keep this list in sync with COUPLE_EMAILS in src/lib/coupleAccess.ts and
-- the allowlist in couple_sharing.sql if it ever changes.

create table if not exists letters (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_email text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists letters_created_at_idx on letters(created_at);

alter table letters enable row level security;

drop policy if exists "letters_allowed_select" on letters;
create policy "letters_allowed_select" on letters
  for select
  using ((auth.jwt() ->> 'email') in ('terrencefinchum@gmail.com', 'brookefinchum@gmail.com'));

drop policy if exists "letters_allowed_insert" on letters;
create policy "letters_allowed_insert" on letters
  for insert
  with check (
    (auth.jwt() ->> 'email') in ('terrencefinchum@gmail.com', 'brookefinchum@gmail.com')
    and author_id = auth.uid()
  );

drop policy if exists "letters_author_delete" on letters;
create policy "letters_author_delete" on letters
  for delete
  using (author_id = auth.uid());

-- Enable realtime so a letter written on one device shows up for the other
-- person without a manual refresh.
alter publication supabase_realtime add table letters;
