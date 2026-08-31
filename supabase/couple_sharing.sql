-- Couple sharing — Supabase schema
-- Run this once in the Supabase SQL Editor, AFTER schema.sql,
-- bill_tracker_schema.sql, and goals_tracker_schema.sql have already run.
--
-- What this does: Debts, Bills, and Goals were originally fully
-- private-per-user (each account only ever sees its own rows). This adds
-- mutual read/write access between the two allowlisted accounts (same
-- allowlist Letters already uses — see COUPLE_EMAILS in
-- src/lib/coupleAccess.ts, and update both places if it ever changes), so
-- Terrence and Brooke fully share and can edit each other's Debts, Bills,
-- and Goals data. This is ADDITIVE — the original owner-only policies stay
-- in place unchanged, so anyone else who signs up still gets the original
-- fully-private-per-user experience. Only the two allowlisted accounts get
-- the extra shared access.

-- Looks up whether a given auth user id belongs to one of the two allowed
-- accounts. SECURITY DEFINER because normal client roles can't query
-- auth.users directly — this function runs with elevated privileges to do
-- that one lookup safely, only ever returning true/false.
create or replace function public.is_couple_member(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users u
    where u.id = check_user_id
      and u.email in ('terrencefinchum@gmail.com', 'brookefinchum@gmail.com')
  );
$$;

-- Note: Supabase grants EXECUTE on new public-schema functions to
-- anon/authenticated by default, and "revoke ... from public" alone does
-- NOT undo that (those are separate default-privilege grants, not grants to
-- the PUBLIC pseudo-role) — revoke from anon explicitly, or an
-- unauthenticated caller can hit /rest/v1/rpc/is_couple_member directly.
revoke execute on function public.is_couple_member(uuid) from public;
revoke execute on function public.is_couple_member(uuid) from anon;
grant execute on function public.is_couple_member(uuid) to authenticated;

-- Debts: accounts
drop policy if exists "accounts_couple_shared" on accounts;
create policy "accounts_couple_shared" on accounts
  for all
  using (
    (auth.jwt() ->> 'email') in ('terrencefinchum@gmail.com', 'brookefinchum@gmail.com')
    and public.is_couple_member(accounts.user_id)
  )
  with check (
    (auth.jwt() ->> 'email') in ('terrencefinchum@gmail.com', 'brookefinchum@gmail.com')
    and public.is_couple_member(accounts.user_id)
  );

-- Debts: balance_entries (shared whenever their parent account is shared)
drop policy if exists "balance_entries_couple_shared" on balance_entries;
create policy "balance_entries_couple_shared" on balance_entries
  for all
  using (
    (auth.jwt() ->> 'email') in ('terrencefinchum@gmail.com', 'brookefinchum@gmail.com')
    and exists (
      select 1 from accounts a
      where a.id = balance_entries.account_id
        and public.is_couple_member(a.user_id)
    )
  )
  with check (
    (auth.jwt() ->> 'email') in ('terrencefinchum@gmail.com', 'brookefinchum@gmail.com')
    and exists (
      select 1 from accounts a
      where a.id = balance_entries.account_id
        and public.is_couple_member(a.user_id)
    )
  );

-- Bills
drop policy if exists "bill_tracker_couple_shared" on bill_tracker;
create policy "bill_tracker_couple_shared" on bill_tracker
  for all
  using (
    (auth.jwt() ->> 'email') in ('terrencefinchum@gmail.com', 'brookefinchum@gmail.com')
    and public.is_couple_member(bill_tracker.user_id)
  )
  with check (
    (auth.jwt() ->> 'email') in ('terrencefinchum@gmail.com', 'brookefinchum@gmail.com')
    and public.is_couple_member(bill_tracker.user_id)
  );

-- Goals
drop policy if exists "goals_tracker_couple_shared" on goals_tracker;
create policy "goals_tracker_couple_shared" on goals_tracker
  for all
  using (
    (auth.jwt() ->> 'email') in ('terrencefinchum@gmail.com', 'brookefinchum@gmail.com')
    and public.is_couple_member(goals_tracker.user_id)
  )
  with check (
    (auth.jwt() ->> 'email') in ('terrencefinchum@gmail.com', 'brookefinchum@gmail.com')
    and public.is_couple_member(goals_tracker.user_id)
  );

-- Bills and Goals didn't have realtime enabled before (they synced on next
-- load/save only). Now that two people are actively editing the same row,
-- enable it so one person's edit shows up for the other without a manual
-- refresh — same as Debts and Letters already do.
alter publication supabase_realtime add table bill_tracker;
alter publication supabase_realtime add table goals_tracker;
