# CLAUDE.md — Tai Motion funnel (`Leadoni/taichi`)

## Supabase edge functions: keep git ↔ deployment in sync (REQUIRED)

The Supabase project (`pixtozeghxwiidpnloih`) is the source of truth for what
actually runs. Edge functions can be deployed directly (CLI/dashboard), so git
and production can drift. Two non-negotiable steps:

**BEFORE changing any edge function** (`supabase/functions/*`):
1. `git fetch` and make sure your branch is current with `origin/main` — a stale
   local checkout is the #1 cause of "phantom drift".
2. Verify git matches what's deployed:
   ```bash
   supabase functions download <name> --project-ref pixtozeghxwiidpnloih
   ```
   `deno fmt` both sides before diffing — the download is the transpiled eszip
   bundle (types stripped, reformatted), so compare **logic**, not formatting.
3. If the deployed code differs from git, **git is behind** → reconcile first
   (commit the deployed logic as the baseline) BEFORE editing. Never edit or
   deploy from a stale repo, or you will overwrite live features.

**AFTER deploying any edge function** (`supabase functions deploy <name> …`):
- **Commit the deployed code to git in the same session.** A deploy that isn't
  committed re-creates the drift this rule exists to prevent.

Deploy flags (see `supabase/functions/README.md`): `stripe-webhook` deploys with
`--no-verify-jwt` (Stripe sends no JWT); `create-subscription` / `charge-upsell`
deploy with `verify_jwt` on.
