# Stripe Config — Tai Motion (TEST / sandbox)

Created 2026-07-06 via Stripe API (test mode). Secrets (`sk_test`, `whsec`) are NOT stored here — they live only in Supabase function secrets.

## Base plans (Product → recurring Price → one-time intro Coupon)
| Plan | Product | Price (regular) | Coupon (intro once) | First charge → renewal |
|------|---------|-----------------|---------------------|------------------------|
| 1w  | prod_UpmIsciIjAtK8Q | price_1Tq6jrEKxtNHIkyECsS78Flp | pkEtKPXU | $5.19 → $21.99 / week |
| 4w  | prod_UpmIlaaQvnkkuC | price_1Tq6jsEKxtNHIkyEephY6ycG | BBjhT92G | $9.99 → $49.95 / 4 weeks |
| 12w | prod_UpmI1v856lWsNt | price_1Tq6jtEKxtNHIkyE2LbKbfuk | vgeoGVPv | $19.99 → $84.95 / 12 weeks |

## Webhook endpoint
- id: `we_1Tq6loEKxtNHIkyEZVeIgR3Y`  → `https://pixtozeghxwiidpnloih.supabase.co/functions/v1/stripe-webhook`
- events: invoice.paid, customer.subscription.updated, customer.subscription.deleted, payment_intent.succeeded

## Publishable key (safe in frontend — Plan 3 config.js)
`pk_test_51Tq6eVEKxtNHIkyEH26s3Yb09P17pwsgrnl3e8ylSrOGhv2ODsw4mVh2IU3Nycl2vSY9afNCWSD0QHJubdo64Fos00roD8Yf2g`

## Deployed edge functions
- create-subscription (verify_jwt=true) — base checkout
- stripe-webhook (verify_jwt=false) — provisioning source of truth
- charge-upsell — PENDING recurring-upsell model decision (one-time part ready)

## Upsells
- One-time (no Stripe object needed; ad-hoc PaymentIntent): essential_guides_onetime $9.99, guide_sleep/eating/aging $18.99, vip $4.99
- Recurring (needs decision — see plan): essential_guides ("$1.25/day"), all_guides ($38.99)
