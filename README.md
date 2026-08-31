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
- **Letters** — a private space for writing letters back and forth with one
  other specific person. Unlike the other three modules, this one is **not**
  private-per-account — it's locked to a hardcoded two-email allowlist (see
  below), since signup itself is open to anyone.

Full-height left sidebar (collapses to a top bar + slide-in drawer below
768px) with navigation, light/dark theme toggle, and account controls —
applied everywhere, including the logged-out landing page.

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
   - [`supabase/letters_schema.sql`](supabase/letters_schema.sql) — `letters`
     table for the Letters module. **Different access model** — see below.

   The first three scope every row to the signed-in user via row-level
   security, so nobody can ever see another user's data. `letters` is the
   exception: it's shared between exactly two hardcoded email addresses (see
   "Letters access" below), not the general-purpose per-user model.
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

### Letters access

The Letters module is restricted to two specific email addresses, hardcoded
in two places that must stay in sync:

- `LETTERS_ALLOWED_EMAILS` in [`src/lib/lettersAccess.ts`](src/lib/lettersAccess.ts)
  — controls whether the "Letters" nav link even appears, and the client-side
  "not available" fallback.
- The `auth.jwt() ->> 'email'` checks in
  [`supabase/letters_schema.sql`](supabase/letters_schema.sql)'s row-level
  security policies — the actual enforcement. Anyone else who signs up to the
  app cannot read or write `letters` rows even if they navigate straight to
  `/letters`.

To change who has access (e.g. swap in a different email), update both
places and re-run the policy statements in the SQL editor.

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
- **`letters`** — one row per letter (author, email, body, timestamp).
  Readable by both allowed accounts; each person can only insert/delete their
  own rows. See "Letters access" above.
- Every row in the first three tables is scoped to the signed-in user via
  Postgres row-level security (`auth.uid()`); `letters` is scoped to the
  two-email allowlist instead. The Debts and Letters tables have Supabase
  Realtime enabled, so changes push live to every open device without a
  manual refresh (Bills and Goals sync on next load/save rather than
  live-push).

## Project structure

```
src/
  components/   Sidebar, AuthModal (sign in/up), CardPanel + GroupSection + ChangeChip + ProgressBar (Debts),
                BillTracker (Bills), GoalsTracker (Goals), LettersTracker (Letters)
  hooks/        useAuth (session), useAccounts (Debts data + realtime sync), useTheme (light/dark palette)
  lib/          supabaseClient, debt math helpers (formatCurrency, pct, etc.), lettersAccess (Letters allowlist)
  types.ts      Account/BalanceEntry/Group types + GROUP_COLORS
supabase/
  schema.sql               Debts: accounts + balance_entries, RLS, realtime
  bill_tracker_schema.sql  Bills: bill_tracker table + RLS
  goals_tracker_schema.sql Goals: goals_tracker table + RLS
  letters_schema.sql       Letters: letters table + allowlist RLS + realtime
```
