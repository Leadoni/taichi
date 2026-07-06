# Supabase Edge Functions (Deno)

Source of truth for the Stripe integration's server side. These run on **Supabase Edge (Deno)**, not Node — so a local Node/TS editor will flag `Deno`, `npm:…`, and `jsr:…` as "unknown"; that's expected and harmless. They are verified working when deployed.

## Functions

| Function | verify_jwt | Purpose |
|----------|-----------|---------|
| `create-subscription` | true | Creates the Stripe Customer (if needed) + an incomplete Subscription with the plan's recurring price + one-time intro coupon; returns the PaymentIntent `clientSecret` for the browser's Stripe Elements. |
| `charge-upsell` | true | Charges an accepted upsell off-session on the saved card: one-time → PaymentIntent; recurring → a **separate** subscription (Option A). Returns `accepted` / `requires_action` (SCA) / `failed`. |
| `stripe-webhook` | **false** | Stripe's signed callback (verified via `constructEventAsync` on the raw body). **The only writer of billing state**: mirrors subscriptions, records payments, and provisions `users` access. Idempotent via `stripe_events`. Only the base subscription (no `upsell_id` metadata) drives `users.subscription_status`. |

(`submit-quiz`, `complete-order`, `login-link` also exist on the project but predate this repo; `complete-order` is the legacy fake-provisioning path to be removed in Plan 3.)

## Config lives in code (safe) vs secrets (never here)
- **In code:** the `PLANS` / `UPSELLS` maps (Stripe **price/coupon** ids — not secret). The browser only sends a plan/upsell *id*; amounts are resolved server-side.
- **Secrets (Supabase → Edge Functions → Secrets, never committed):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` are auto-injected.)

## Deploy
Currently deployed to project `pixtozeghxwiidpnloih` (test mode). To redeploy after edits:

```bash
supabase functions deploy create-subscription --project-ref pixtozeghxwiidpnloih
supabase functions deploy charge-upsell       --project-ref pixtozeghxwiidpnloih
supabase functions deploy stripe-webhook --no-verify-jwt --project-ref pixtozeghxwiidpnloih
```

Stripe test-mode product/price/coupon/webhook ids are recorded in `../../docs/superpowers/reference/stripe-config.md`.
