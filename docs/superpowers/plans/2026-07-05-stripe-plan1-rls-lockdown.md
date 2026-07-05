# Stripe Integration — Plan 1: RLS Lockdown + Security Audit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Supabase database safe for real money — no client can grant itself access or read another user's data — before any Stripe code exists.

**Architecture:** Postgres RLS + a billing-column write-guard trigger. App access is decided by `users.subscription_status`/`current_period_end`, which become writable **only** by the service role (the future Stripe webhook). Every other table gets an explicit RLS policy: content tables = public read of published rows; per-user tables = own-row only. Verified by SQL that simulates the `authenticated` role and asserts denials.

**Tech Stack:** Supabase Postgres 15, RLS policies, PL/pgSQL trigger, SQL run via the Supabase SQL editor (or the Supabase MCP once project `pixtozeghxwiidpnloih` is connected).

## Global Constraints

- **Target project:** `pixtozeghxwiidpnloih` (NOT the MCP's currently-connected account). Confirm the project ref before running any DDL.
- **Billing columns** (service-role-write-only, never user-writable): `subscription_status`, `current_period_end`, `cancel_at_period_end`, `stripe_customer_id`, `stripe_subscription_id`.
- **No downtime for reads:** the members' app is live; content tables must remain publicly readable for published rows throughout.
- **Do not touch** DNS, email, or any table's *data* — this plan changes policies/structure only.
- **Every DDL step is its own migration** (reversible, reviewable). Name migrations `NN_description`.
- Supabase helper functions available: `auth.uid()` (current user id from JWT `sub`), `auth.role()` (JWT role: `anon` | `authenticated` | `service_role`).

---

### Task 1: Capture the real schema, policies, and advisor state (baseline)

**Files:**
- Create: `taichi/docs/superpowers/baselines/2026-07-05-supabase-rls-baseline.md`

**Interfaces:**
- Produces: the authoritative list of tables, which have RLS enabled, existing policies, and the exact column list of `public.users` — every later task binds to this.

- [ ] **Step 1: Confirm the correct project**

Run (MCP `list_projects`, or Supabase dashboard URL): confirm you are operating on ref `pixtozeghxwiidpnloih`. If the MCP is on another account, either connect this project to the MCP or plan to run all SQL in that project's **SQL editor**.

- [ ] **Step 2: Dump RLS status for every table**

```sql
select n.nspname as schema, c.relname as table, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
```

- [ ] **Step 3: Dump all existing policies**

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;
```

- [ ] **Step 4: Dump the `users` column list**

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='users' order by ordinal_position;
```

- [ ] **Step 5: Run the security advisor**

Run (MCP `get_advisors` type `security`, or dashboard → Advisors). Record every table flagged for "RLS disabled" or "policy allows public access."

- [ ] **Step 6: Record the baseline and commit**

Paste all outputs into the baseline file, noting which tables **lack RLS** or have **permissive** policies (these are the audit targets for Task 7).

```bash
git add taichi/docs/superpowers/baselines/2026-07-05-supabase-rls-baseline.md
git commit -m "docs: capture Supabase RLS baseline before lockdown"
```

---

### Task 2: Add Stripe id columns to `users`

**Files:**
- Migration: `NN_add_stripe_ids_to_users`

**Interfaces:**
- Produces: `public.users.stripe_customer_id text`, `public.users.stripe_subscription_id text` (consumed by Plan 2's edge functions and webhook).

- [ ] **Step 1: Write the migration**

```sql
alter table public.users add column if not exists stripe_customer_id text;
alter table public.users add column if not exists stripe_subscription_id text;
create unique index if not exists users_stripe_customer_id_key
  on public.users (stripe_customer_id) where stripe_customer_id is not null;
```

- [ ] **Step 2: Apply and verify columns exist**

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='users'
  and column_name in ('stripe_customer_id','stripe_subscription_id');
```
Expected: 2 rows.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(db): add stripe_customer_id/stripe_subscription_id to users"
```

---

### Task 3: Billing-column write-guard trigger (the core lockdown)

**Files:**
- Migration: `NN_users_billing_write_guard`

**Interfaces:**
- Consumes: billing columns from Global Constraints; `users.stripe_*` from Task 2.
- Produces: trigger `trg_users_billing_guard` that raises unless `auth.role() = 'service_role'` when any billing column changes.

- [ ] **Step 1: Write the failing test (self-update must be rejected)**

```sql
-- TEST (run in a transaction you will roll back). Pick a real user id from users.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"REPLACE_WITH_REAL_USER_UUID","role":"authenticated"}';
  -- Attempt self-grant:
  update public.users set subscription_status='active'
    where id = 'REPLACE_WITH_REAL_USER_UUID';
rollback;
```
Expected BEFORE the trigger exists: the UPDATE **succeeds** (this is the vulnerability). Confirm it succeeds, proving the hole.

- [ ] **Step 2: Write the trigger**

```sql
create or replace function public.users_billing_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    if new.subscription_status  is distinct from old.subscription_status
    or new.current_period_end   is distinct from old.current_period_end
    or new.cancel_at_period_end is distinct from old.cancel_at_period_end
    or new.stripe_customer_id   is distinct from old.stripe_customer_id
    or new.stripe_subscription_id is distinct from old.stripe_subscription_id then
      raise exception 'billing columns are not user-editable';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_billing_guard on public.users;
create trigger trg_users_billing_guard
  before update on public.users
  for each row execute function public.users_billing_guard();
```

- [ ] **Step 3: Re-run the test — self-update must now fail**

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"REPLACE_WITH_REAL_USER_UUID","role":"authenticated"}';
  update public.users set subscription_status='active' where id = 'REPLACE_WITH_REAL_USER_UUID';
rollback;
```
Expected: `ERROR: billing columns are not user-editable`.

- [ ] **Step 4: Verify service role is still allowed**

```sql
begin;
  set local role service_role;
  set local request.jwt.claims = '{"role":"service_role"}';
  update public.users set subscription_status='active' where id = 'REPLACE_WITH_REAL_USER_UUID';
rollback;
```
Expected: UPDATE succeeds (0 or 1 row, no error).

- [ ] **Step 5: Verify a normal profile edit still works**

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"REPLACE_WITH_REAL_USER_UUID","role":"authenticated"}';
  update public.users set name='Test Name' where id = 'REPLACE_WITH_REAL_USER_UUID';
rollback;
```
Expected: succeeds (non-billing column allowed).

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(db): block user writes to billing columns (service-role only)"
```

---

### Task 4: `users` RLS — own-row read/write only

**Files:**
- Migration: `NN_users_rls_own_row`

**Interfaces:**
- Consumes: `auth.uid()`.
- Produces: RLS enabled on `users` with SELECT/UPDATE restricted to `id = auth.uid()`. (Task 3's trigger still governs *which columns*.)

- [ ] **Step 1: Write the failing test (read another user's row)**

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"USER_A_UUID","role":"authenticated"}';
  select count(*) from public.users where id = 'USER_B_UUID';  -- a DIFFERENT user
rollback;
```
Expected once RLS is on: `0`. (Before RLS: may return 1 — the hole.)

- [ ] **Step 2: Enable RLS + policies**

```sql
alter table public.users enable row level security;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated using (id = auth.uid());

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- No INSERT/DELETE policy: users cannot create or delete rows (handled by auth triggers/service role).
```

- [ ] **Step 3: Re-run the cross-user read test**

Expected: `0` rows.

- [ ] **Step 4: Verify own-row read still works**

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"USER_A_UUID","role":"authenticated"}';
  select count(*) from public.users where id = 'USER_A_UUID';
rollback;
```
Expected: `1`.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(db): RLS on users — own-row select/update only"
```

---

### Task 5: `purchases` + `stripe_events` tables

**Files:**
- Migration: `NN_purchases_and_stripe_events`

**Interfaces:**
- Produces: `public.purchases` (entitlements, service-role write, own-row read) and `public.stripe_events` (webhook idempotency, service-role only). Consumed by Plan 2's webhook.

- [ ] **Step 1: Create tables**

```sql
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,                       -- e.g. 'essential_guides'
  stripe_payment_intent_id text,
  stripe_subscription_item_id text,
  created_at timestamptz not null default now()
);
create index if not exists purchases_user_id_idx on public.purchases(user_id);

create table if not exists public.stripe_events (
  event_id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
```

- [ ] **Step 2: Enable RLS + policies**

```sql
alter table public.purchases enable row level security;
drop policy if exists purchases_select_own on public.purchases;
create policy purchases_select_own on public.purchases
  for select to authenticated using (user_id = auth.uid());
-- No client insert/update/delete: only service role writes purchases.

alter table public.stripe_events enable row level security;
-- No policies at all → only service role (which bypasses RLS) can touch it.
```

- [ ] **Step 3: Verify client cannot insert a purchase**

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"USER_A_UUID","role":"authenticated"}';
  insert into public.purchases(user_id, kind) values ('USER_A_UUID','hack');
rollback;
```
Expected: `ERROR ... policy` (insert denied — no INSERT policy).

- [ ] **Step 4: Verify client can read own purchases**

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"USER_A_UUID","role":"authenticated"}';
  select count(*) from public.purchases where user_id = 'USER_A_UUID';
rollback;
```
Expected: succeeds (count ≥ 0, no error).

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(db): purchases + stripe_events tables with locked RLS"
```

---

### Task 6: `subscriptions` RLS — own-row read, service-role write

**Files:**
- Migration: `NN_subscriptions_rls`

**Interfaces:**
- Consumes: existing `public.subscriptions` (has `user_id`, `cancel_at_period_end` per `db.js`).
- Produces: RLS so users read only their own subscription; no client writes.

- [ ] **Step 1: Enable RLS + select-own policy**

```sql
alter table public.subscriptions enable row level security;
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (user_id = auth.uid());
-- No client write policy → service role only.
```

> Note: `db.js` currently calls `setAutoRenew` which does `SB.from("subscriptions").update({cancel_at_period_end})` from the client. With this lockdown that client update will now fail. Plan 2/3 must move cancel/auto-renew behind an edge function (service role) or a dedicated RPC. **Flag this in Plan 3.**

- [ ] **Step 2: Verify client cannot update a subscription**

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"USER_A_UUID","role":"authenticated"}';
  update public.subscriptions set cancel_at_period_end = true where user_id = 'USER_A_UUID';
rollback;
```
Expected: 0 rows affected / denied (no UPDATE policy).

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(db): RLS on subscriptions — own-row read, no client write"
```

---

### Task 7: Full-schema RLS audit sweep

**Files:**
- Migration: `NN_rls_audit_sweep`

**Interfaces:**
- Consumes: Task 1 baseline (the list of tables lacking RLS / permissive policies).
- Produces: every `public` table has RLS enabled with an explicit, correct policy.

**Policy rules to apply per table category:**
- **Content (public read of published rows, no client write):** `sessions`, `media_sessions`, `recipes`, `lessons`, `challenges`.
- **Per-user (own-row read/write):** `user_session_progress`, `favorites`, `progress_checkins`, `fasting_logs`, `user_lesson_progress`, `user_challenges`, `meal_plan_items`, `meal_plan_runs`.
- **Lead capture (insert-only from anon, no read):** `quiz_sessions` (the funnel writes these before auth).

- [ ] **Step 1: Write the failing test (anon reads another user's progress)**

```sql
begin;
  set local role anon;
  set local request.jwt.claims = '{"role":"anon"}';
  select count(*) from public.user_session_progress;  -- anon should see nothing
rollback;
```
Expected once secured: `0` (or error). Before: may return rows (the hole).

- [ ] **Step 2: Content tables — RLS + public published read**

```sql
do $$
declare t text;
begin
  foreach t in array array['sessions','media_sessions','recipes','lessons','challenges'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_read_published on public.%I', t, t);
    execute format($p$create policy %I_read_published on public.%I
      for select to anon, authenticated using (coalesce(is_published, true))$p$, t, t);
  end loop;
end $$;
```

- [ ] **Step 3: Per-user tables — RLS + own-row for all commands**

```sql
do $$
declare t text;
begin
  foreach t in array array['user_session_progress','favorites','progress_checkins',
      'fasting_logs','user_lesson_progress','user_challenges','meal_plan_items','meal_plan_runs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_own on public.%I', t, t);
    execute format($p$create policy %I_own on public.%I
      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())$p$, t, t);
  end loop;
end $$;
```

- [ ] **Step 4: `quiz_sessions` — anon insert only, no read**

```sql
alter table public.quiz_sessions enable row level security;
drop policy if exists quiz_sessions_insert_anon on public.quiz_sessions;
create policy quiz_sessions_insert_anon on public.quiz_sessions
  for insert to anon, authenticated with check (true);
-- No select policy → nobody reads via the anon key (webhook/service role reads server-side).
```

> Note: `db.js` `profile()` reads `quiz_sessions` from the client for the logged-in member. If that must keep working, add a select-own policy keyed on the member's email/id link instead of blocking all reads. Decide during Task 1 based on how `quiz_sessions` rows are associated to users. If there is no user linkage column, keep reads server-side and have Plan 2 expose the needed fields via the profile edge function.

- [ ] **Step 5: Re-run the anon-read test and re-run the security advisor**

Expected: anon read returns `0`; advisor reports **no** "RLS disabled" or "public policy" findings on `public` tables.

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(db): RLS audit sweep — every public table has an explicit policy"
```

---

## Self-Review

**Spec coverage (Section 3 of the design):**
- Add `stripe_customer_id`/`stripe_subscription_id` → Task 2. ✅
- Billing columns service-role-write-only → Task 3 (trigger). ✅ *(Design listed column-GRANT or SECURITY DEFINER RPC; the trigger is a cleaner third option that needs no full-column enumeration — noted as a refinement.)*
- `purchases`, `stripe_events` tables → Task 5. ✅
- `users` own-row RLS → Task 4. ✅
- `subscriptions` own-row read / service write → Task 6. ✅
- Prerequisite audit of every table → Task 7. ✅
- Verification: self-grant rejected → Task 3 Step 3; cross-user read blocked → Task 4/7. ✅

**Open items surfaced for later plans:**
- `db.js` `setAutoRenew` (client update to `subscriptions`) breaks under the lockdown → Plan 3 must route cancel/auto-renew through an edge function/RPC (flagged in Task 6).
- `db.js` `profile()` reads `quiz_sessions` client-side → resolve the user-linkage question in Task 1; either add a select-own policy or move the read server-side (flagged in Task 7).

**Placeholder scan:** `REPLACE_WITH_REAL_USER_UUID` / `USER_A_UUID` / `USER_B_UUID` are intentional test fixtures the executor fills from Task 1's real data — not plan placeholders. Migration numbers `NN` are assigned at apply time.

**Execution prerequisite:** target project `pixtozeghxwiidpnloih` must be reachable (MCP connection or SQL editor). The MCP is currently on a different account.

---

## Execution Log — 2026-07-05 (live DB `pixtozeghxwiidpnloih` / TaiMotion_Astronaut)

**Reality check changed the plan.** Introspection showed the DB was already far more locked-down than `db.js` implied:

- **RLS already enabled on every table.** Content tables = SELECT `is_published` (public read); all per-user tables = `ALL using(user_id = auth.uid())` (own-row). `exercises`/`session_exercises` = public read (`true`) — acceptable (static, non-sensitive).
- **Stripe data model already scaffolded:** `users.stripe_customer_id` exists; `subscriptions` (id=stripe sub id, price_id, periods, cancel_at_period_end), `payments` (the entitlement/charge ledger — replaces the planned `purchases`), and `stripe_events` (idempotency; RLS-on/no-policy = correct deny-all) all present.
- `subscriptions`/`payments` = select-own, **no client write** ✅. `quiz_sessions.user_id` exists → `quiz_select_own` covers the app's read.

**Therefore Tasks 2, 4, 5, 6, 7 were already satisfied.** The only live vulnerability was **Task 3**.

**Task 3 — DONE & verified:**
- Exploit proven first: simulated `authenticated` user `update users set subscription_status=…` → **"self-grant SUCCEEDED — VULNERABLE"**.
- Applied migration `users_billing_write_guard`: `BEFORE UPDATE` trigger `trg_users_billing_guard` + `public.users_billing_guard()`. Blocks changes to `subscription_status`, `subscription_plan`, `current_period_start/end`, `cancel_at_period_end`, `stripe_customer_id` unless `auth.role()` ∉ {authenticated, anon} (i.e., service_role / no-JWT admin).
- Re-verified: self-grant **BLOCKED**; profile `name` edit **allowed**; service_role billing write **allowed**. (All test writes rolled back.)

**Open items for later plans (confirmed against real schema):**
- `db.js` `setAutoRenew` writes `subscriptions` (no client write policy → already fails) **and** `users.cancel_at_period_end` (now guard-blocked) → **Plan 3 must route cancel/auto-renew through an edge function / service role.**
- `db.js` `profile()` read of `quiz_sessions` — **works** (`quiz_select_own` own-row policy exists). No change needed.

**Minor advisor findings (out of scope, note for later):** `recipe-images` public bucket allows file listing (cosmetic); Auth leaked-password protection disabled (toggle in Auth settings).

**Status: Plan 1 COMPLETE** — DB is safe for money (no client can self-grant or read others' data).
