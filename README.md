# Oaksteadly

A React + Supabase personal dashboard, with real auth and a real database so
everything stays in sync across every device. Three modules, one login:

- **Debts** — groups debt accounts into **Credit Card / Real Estate / Autos /
  Other**, tracks monthly balances with green/red percent-change chips, APR,
  monthly payment, payoff progress bars, and grand-total summaries.
- **Bills** — recurring bills and one-off expenses with List / Month / Week /
  Notes views, paid + bank-cleared tracking, and an optional note per bill
  (e.g. "Autopay from Checking").
- **Goals** — seven life-area boxes (Faith, Family, Friends, Finances,
  Fitness, Fun, Future) for plain-text goals that reset fresh every month.

Full-height left sidebar (collapses to a top bar + slide-in drawer below
768px on the logged-out landing page, or a bottom icon nav once logged in)
with navigation, light/dark theme toggle, and account controls.

**Two accounts share and co-edit everything.** By default every module is
private-per-account, but this app is configured for a couple: two hardcoded
email addresses fully share and can edit each other's Debts, Bills, and
Goals — an edit from either side shows up for the other without a manual
refresh. Anyone else who signs up still gets the original
fully-private-per-user experience. See "Couple sharing" below.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project (any
   name/region is fine).
2. In the project dashboard, open **SQL Editor → New query** and run each of
   these in turn:
   - [`supabase/schema.sql`](supabase/schema.sql) — `accounts` +
     `balance_entries` tables for the Debts module, with row-level security
     and realtime sync.
   - [`supabase/bill_tracker_schema.sql`](supabase/bill_tracker_schema.sql) —
     `bill_tracker` table for the Bills module.
   - [`supabase/goals_tracker_schema.sql`](supabase/goals_tracker_schema.sql)
     — `goals_tracker` table for the Goals module.
   - [`supabase/couple_sharing.sql`](supabase/couple_sharing.sql) — run this
     **last**, after all three tables above exist. Grants two hardcoded email
     addresses mutual read/write access to each other's Debts, Bills, and
     Goals data. See "Couple sharing" below.

   Each table starts out scoped to the signed-in user via row-level security,
   so nobody can see another user's data — `couple_sharing.sql` then adds
   mutual access between exactly the two people you configure, on top of
   that, without removing the per-user protection for anyone else.

   **Note on `supabase/letters_schema.sql`**: an earlier "Letters" module
   used to live here. The module has been removed from the app, but that
   schema file (and its `letters` table/data in your Supabase project) is
   left alone deliberately — nothing in this app reads from it anymore, and
   it's not part of this setup flow. Delete the table yourself in the
   Supabase dashboard if you want it gone too.
3. Open **Project Settings → Data API**. Copy the **Project URL** and the
   **anon public** key — you'll need both in step 3 below.

## 2. Signup is self-service — each person gets their own private account

The app's header has **Log in** / **Sign up** buttons. Anyone can create their
own account from the Sign Up form (email + password) — there's no invite step
or admin approval. Every module's data is completely private per account.

By default, Supabase requires email confirmation before a new account can
sign in — after signing up, the app shows "check your email to confirm it."
If you'd rather skip that step during testing (or for a small trusted group),
go to **Authentication → Providers → Email** and turn off **Confirm email**
— new signups will then be signed in immediately.

**Security note:** because signup is open to anyone with the link, this is
appropriate once you're comfortable with strangers being able to create
accounts (each isolated to their own private data). If you want to restrict
who can sign up at all (e.g. only people you invite), that needs to be
configured in Supabase (disable public signups and invite users manually
instead) — not something the current app UI does.

### Couple sharing

Two specific email addresses share and co-edit everything — Debts, Bills,
and Goals — instead of each getting their own siloed data. This is
hardcoded in two places that must stay in sync:

- `COUPLE_EMAILS` / `COUPLE_PEOPLE` in
  [`src/lib/coupleAccess.ts`](src/lib/coupleAccess.ts) — controls the
  "Shared with" info shown on the Account page.
- The `auth.jwt() ->> 'email'` checks in
  [`supabase/couple_sharing.sql`](supabase/couple_sharing.sql)'s policies —
  the actual enforcement for Debts, Bills, and Goals.

Anyone else who signs up to the app cannot see or write into either
person's data, and still gets the original private-per-user experience for
Debts/Bills/Goals — `couple_sharing.sql` only adds access, it never removes
the owner-only policies.

**How Bills/Goals sharing actually works**: those two tables store one JSON
blob per row (not one row per item), originally keyed one-row-per-user. Now
whichever row already exists is treated as *the* shared row — `BillTracker`
and `GoalsTracker` no longer filter by "my own user_id" when loading; they
just load whatever row RLS lets them see (which, for the two allowed
accounts, is always that one shared row) and remember its real owner so
every future save keeps writing to that same row, regardless of who's
signed in. Debts needed no such change — `accounts` already supports many
rows from different owners, so broadening the RLS policy alone was enough.

To change who has access (e.g. swap in a different email), update both
places above and re-run the policy statements in the SQL editor.

## 3. Configure and run the app

```bash
cp .env.example .env
# edit .env and paste in your Project URL + anon key from step 1.3
npm install
npm run dev
```

Visit the printed local URL, click **Sign up** in the header to create an
account, and start adding data.

## 4. Deploy for real cross-device use

The app is a static Vite build, so it can be hosted anywhere that serves
static files (Vercel, Netlify, Cloudflare Pages, etc.):

```bash
npm run build   # outputs to dist/
```

Set the same two `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` environment
variables on whichever host you deploy to. The anon key is safe to expose
publicly — it only allows what the row-level security policies in
`supabase/*.sql` permit (each row scoped to its owning user).

## How data is organized

- **`accounts`** — one row per debt account: name, category (Credit Card /
  Real Estate / Autos / Other), starting balance, monthly payment, APR.
- **`balance_entries`** — one row per monthly balance update for an account.
  The most recent entry (by month) is the account's current balance; the one
  before it is used for the "vs last month" percent-change chip.
- **`bill_tracker`** — one row per user, a single JSON blob holding bills,
  per-month paid/cleared status, and per-month freeform notes.
- **`goals_tracker`** — one row per user, a single JSON blob holding each
  month's goals grouped by category. Goals don't carry over between months.
- Every row starts out scoped to the signed-in user via Postgres row-level
  security (`auth.uid()`); `couple_sharing.sql` adds a second policy on
  `accounts`, `balance_entries`, `bill_tracker`, and `goals_tracker` granting
  the two allowed accounts mutual access on top of that (see "Couple sharing"
  above). All four tables have Supabase Realtime enabled, so an edit from
  either person pushes live to the other's open device without a manual
  refresh.

## Project structure

```
src/
  components/   Sidebar, BottomNav, AccountPage, AuthModal (sign in/up),
                CardPanel + GroupSection + ChangeChip + ProgressBar (Debts),
                BillTracker (Bills), GoalsTracker (Goals)
  hooks/        useAuth (session), useAccounts (Debts data + realtime sync), useTheme (light/dark palette)
  lib/          supabaseClient, debt math helpers (formatCurrency, pct, etc.), coupleAccess (shared-access allowlist)
  types.ts      Account/BalanceEntry/Group types + GROUP_COLORS
supabase/
  schema.sql               Debts: accounts + balance_entries, RLS, realtime
  bill_tracker_schema.sql  Bills: bill_tracker table + RLS
  goals_tracker_schema.sql Goals: goals_tracker table + RLS
  couple_sharing.sql       Run last: shares Debts/Bills/Goals between the two allowed accounts
  letters_schema.sql       No longer used by the app — see note in step 1
```
