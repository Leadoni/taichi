# Supabase Edge Functions (Deno)

Source of truth for the Stripe integration's server side. These run on **Supabase Edge (Deno)**, not Node — so a local Node/TS editor will flag `Deno`, `npm:…`, and `jsr:…` as "unknown"; that's expected and harmless. They are verified working when deployed.

## Functions

| Function | verify_jwt | Purpose |
|----------|-----------|---------|
| `create-subscription` | true | Creates the Stripe Customer (if needed) + an incomplete Subscription with the plan's recurring price + one-time intro coupon; returns the PaymentIntent `clientSecret` for the browser's Stripe Elements. Fires the 👤 account-created Slack alert. |
| `charge-upsell` | true | Charges an accepted upsell off-session on the saved card: one-time → PaymentIntent; recurring → a **separate** subscription (Option A). Returns `accepted` / `requires_action` (SCA) / `failed`. |
| `stripe-webhook` | **false** | Stripe's signed callback (verified via `constructEventAsync` on the raw body). **The only writer of billing state**: mirrors subscriptions, records payments, and provisions `users` access. Idempotent via `stripe_events`. Only the base subscription (no `upsell_id` metadata) drives `users.subscription_status`. Fires the money/churn Slack alerts. |
| `submit-quiz` | **false** | Upserts the quiz session as the visitor answers. Fires the 📧 new-lead Slack alert when a session first captures an email (anonymous — no lead PII in Slack). |
| `slack-stats` | **false** | `/stats` Slack slash command → live business numbers. Auth = Slack request-signature verification (`SLACK_SIGNING_SECRET`); acks within Slack's 3s limit, then computes in `EdgeRuntime.waitUntil` and posts to `response_url`. |

(`complete-order`, `login-link` also exist on the project but predate this repo; `complete-order` is the legacy fake-provisioning path to be removed in Plan 3.)

## Slack business alerts + `/stats`

Shared layer in `_shared/slack.ts` (one `notifySlack` + per-event formatters — they
swallow ALL errors: a Slack outage must never fail a Stripe webhook or a user
route), `_shared/slack-verify.ts` (pure HMAC verification, clock injected) and
`_shared/slack-stats.ts` (pure stats math, clients injected). Design/playbook:
`~/Documents/aicurve/docs/slack-business-alerts-playbook.md`.

Alerts: 💰 new subscription / 🔁 renewal (paid > $0) · ❌ cancel scheduled (the
moment `cancel_at_period_end` flips true, via `previous_attributes`) · 🪦
subscription ended · ⚠️ payment failed (amount + attempt) · 💸 refund (full or
partial) · ➕ upsell purchased · 📧 new lead (anonymous) · 👤 account created.

`/stats` metric rules: subscriber stats exclude upsell subs (`metadata.upsell_id`),
internal test subs (`metadata.test='1'`), 100%-off-coupon subs, and (for "new")
`incomplete*` abandoned carts. Revenue = paid invoices > $0 **plus** one-time
upsell PaymentIntents. MRR is list-price, normalized to monthly. % change is vs
the preceding equal window; `n/a` instead of divide-by-zero. Leads = `quiz_sessions`
rows with an email.

Tests: `cd supabase/functions && deno test --allow-env _shared/`

### One-time Slack setup (human)
1. Channel → **Incoming Webhook** → URL into secret `SLACK_WEBHOOK_URL` (already live).
2. api.slack.com/apps → app → **Slash Command** `/stats` → request URL
   `https://pixtozeghxwiidpnloih.supabase.co/functions/v1/slack-stats`.
3. Basic Information → **Signing Secret** → `supabase secrets set SLACK_SIGNING_SECRET=… --project-ref pixtozeghxwiidpnloih` (unset ⇒ `/stats` returns 503; alerts unaffected).
4. Install the app to the workspace, run `/stats`. `operation_timeout` ⇒ the ack/response_url path regressed; `dispatch_failed` ⇒ wrong URL or missing secret.
5. **Stripe dashboard → the live webhook endpoint → add `invoice.payment_failed` and `charge.refunded`** to its enabled events (the ⚠️ and 💸 alerts never fire without them).

## Config lives in code (safe) vs secrets (never here)
- **In code:** the `PLANS` / `UPSELLS` maps (Stripe **price/coupon** ids — not secret). The browser only sends a plan/upsell *id*; amounts are resolved server-side.
- **Secrets (Supabase → Edge Functions → Secrets, never committed):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SLACK_WEBHOOK_URL` (unset = alerts silently disabled), `SLACK_SIGNING_SECRET` (unset = `/stats` returns 503). (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` are auto-injected.)

## Deploy
Currently deployed to project `pixtozeghxwiidpnloih` (test mode). To redeploy after edits:

```bash
supabase functions deploy create-subscription --project-ref pixtozeghxwiidpnloih
supabase functions deploy charge-upsell       --project-ref pixtozeghxwiidpnloih
supabase functions deploy stripe-webhook --no-verify-jwt --project-ref pixtozeghxwiidpnloih
supabase functions deploy submit-quiz    --no-verify-jwt --project-ref pixtozeghxwiidpnloih
supabase functions deploy slack-stats    --no-verify-jwt --project-ref pixtozeghxwiidpnloih  # Slack sends no JWT; auth = request signature
```

Stripe test-mode product/price/coupon/webhook ids are recorded in `../../docs/superpowers/reference/stripe-config.md`.
