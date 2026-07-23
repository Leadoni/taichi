# Tai Motion — Marketing Funnel (`taimotion.com`)

The public-facing acquisition funnel for **Chair Tai Chi**. A quiz-based flow that
qualifies a visitor, captures their details, sells a subscription plan, presents
upsells, and hands them off to the members' app at `app.taimotion.com`.

Static site, no framework, no build step. Deployed via **Cloudflare Pages** from
the repo root (auto-deploys on push to `main`; `_headers`/`_redirects` are the
Cloudflare Pages config; clean URLs — `/pay.html` 308-redirects to `/pay`, so
curl checks need `-L`). The `CNAME` file is a leftover from the old GitHub Pages
setup.

## Page flow

```
index.html ──▶ quiz.html ──▶ checkout.html ──▶ pay.html ──▶ upsell1 ──▶ upsell2 ──▶ upsell3 ──▶ thankyou.html ──▶ app.taimotion.com
 (landing)      (quiz)        (plan select)     (pay)        (offers, decline-able)              (provision + magic link)
```

- **`index.html`** — long-form landing page. CTAs link to `quiz.html?start=1`.
- **`quiz.html`** — the quiz engine host. Loads `config.js` (screens) + `app.js`
  (engine). Gender/age gate first, then the profile/goal screens, then email + name.
- **`checkout.html`** — shows a personalized "your plan is ready" summary and the
  three pricing plans; on selection advances to `pay.html`.
- **`pay.html`** — payment step; seeds the order with the chosen base plan.
- **`upsell1/2/3.html`** — post-purchase offers, each accept/decline, chaining
  forward via a `NEXT` target.
- **`thankyou.html`** — calls the `complete-order` edge function, fetches a fresh
  single-use magic link (`login-link`), then redirects into the app.
- **`walking-guide.html`** — a hidden (noindex) 7-day Tai Chi Walking lead guide.

## Key files (`assets/`)

| File | Purpose |
|------|---------|
| `config.js` | **`FUNNEL.screens`** — the entire quiz as a data array. Screen types: `single`, `multi`, `input`, `info`, `loader`, `email`, `name`, `goals`. Question/option copy mirrors the reference funnel structure; interstitial wording is original. |
| `app.js` | The quiz **engine**: renders one screen at a time, persists answers, computes BMI/projections, handles the gender/age gate and conditional (`femaleOnly`) screens, redirects to checkout at the end. Exposes `window.CTC`. |
| `flow.js` | Post-paywall helpers (`window.FLOW`): accumulates an `order[]` line-item array in the session, plus money formatting and the 3-step checkout header. |
| `api.js` | `window.API` — thin `fetch` wrapper over Supabase edge functions: `submit-quiz`, `complete-order`, `login-link`. |
| `theme.js` | Brown/green palette engine. Reads `?t=g`/`?t=b`, persists a `tm_theme` cookie on `.taimotion.com` (shared with the app), swaps logos, and carries the theme onto `app.taimotion.com` links. Loaded synchronously in `<head>` to avoid a color flash. |
| `testbar.js` | Dev-only helper bar for jumping around the flow. |
| `style.css`, `quiz.css` | Landing/checkout styles and quiz styles. |

## Session & data model

Quiz state lives in `localStorage` under **`ctc_quiz_session`**, shaped to map
directly onto the planned Supabase `quiz_sessions` row:

```js
{ id, funnel: "chair-taichi", created_at, age_band, gender, answers: {…},
  index, email, name, height_cm, weight_kg, goal_weight_kg, bmi,
  selected_plan, order: [ {id, label, amount, recurring, …} ], status }
```

`status` progresses `in_progress` → `checkout` → (provisioned). The `order` array
records exactly which line items (base plan + accepted upsells) the user agreed to,
so real Stripe line items can be wired in later.

## Pricing (checkout.html)

Three introductory plans (USD), regular price shown struck-through:

| Plan | Intro | Per day | Note |
|------|-------|---------|------|
| 1-week  | $5.19  | $0.74 | |
| 4-week  | $9.99  | $0.36 | Most popular |
| 12-week | $19.99 | $0.24 | |

## Local development

Serve the folder with any static server (paths are relative), e.g.:

```bash
cd taichi
python3 -m http.server 8000
# open http://localhost:8000/
```

Append `?t=g` to any URL to preview the green palette. Bump the `?v=NN` on a
changed asset's `<script>`/`<link>` tag to bust the CDN cache.

## Deploy

Push to `main`. Cloudflare Pages builds and serves the repo root at
`taimotion.com` automatically (usually live within a couple of minutes).
