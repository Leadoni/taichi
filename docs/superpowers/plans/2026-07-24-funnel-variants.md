# Quiz Funnel Length Variants (A/B/C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/quiz-b` (no Lifestyle segment) and `/quiz-c` (also no weight/height) funnel variants, tracked via `quiz_sessions.ab_test_name/ab_test_variant`.

**Architecture:** One master screen list in `assets/config.js` plus per-variant cut-lists and copy overrides; thin `quiz-b.html`/`quiz-c.html` pages that differ from `quiz.html` by a single `window.QUIZ_VARIANT` line; the engine (`assets/app.js`) filters screens at boot, before section offsets are computed.

**Tech Stack:** Vanilla JS static site (no build step), Playwright for verification, Supabase (`quiz_sessions`) for assignment persistence — the `ab_test_*` columns and `submit-quiz` pass-through already exist.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-24-funnel-variants-design.md` — cut lists are copied verbatim below.
- `ab_test_name` is exactly `quiz_length_2026_07`.
- Variant A (`quiz.html`) must render byte-for-byte identical behavior to today.
- No changes to checkout/pay/upsell pages or edge functions.
- Static site: bump `?v=` on `config.js`/`app.js` tags in every page that loads them (`quiz.html` today: `config.js?v=58`, `app.js?v=70` → `59`/`71`).
- The engine computes `_secOf/_secLen/_secStart` from `F.screens` at `app.js:58` — the variant filter MUST run before that line.
- `?start=1` boot reset calls `fresh()` — variant fields must be inside `fresh()` or the reset wipes them.
- Verification scripts live in the session scratchpad, not the repo.

---

### Task 1: Variant definitions in config.js

**Files:**
- Modify: `assets/config.js` (append inside `window.FUNNEL = {...}` object, after `screens: [...]`)
- Test: `<scratchpad>/check-variants.js` (node script)

**Interfaces:**
- Produces: `window.FUNNEL.abTestName` (string), `window.FUNNEL.variants` — `{ [variant]: { secs: string[], cut: string[], copy: { [screenId]: Partial<screen> } } }`. Task 2 consumes exactly these names.

- [ ] **Step 1: Write the failing check script**

Write `<scratchpad>/check-variants.js`:

```js
// Loads config.js in a bare context and validates the variant definitions.
const fs = require('fs');
const window = {};
eval(fs.readFileSync(process.argv[2] || 'assets/config.js', 'utf8'));
const F = window.FUNNEL;
const ids = new Set(F.screens.map(s => s.id));
let fail = 0;
const err = (m) => { console.error('FAIL:', m); fail = 1; };

if (F.abTestName !== 'quiz_length_2026_07') err('abTestName wrong: ' + F.abTestName);
if (!F.variants || !F.variants.b || !F.variants.c) err('variants.b/.c missing');
for (const [v, def] of Object.entries(F.variants || {})) {
  const seen = new Set();
  for (const id of def.cut) {
    if (!ids.has(id)) err(`variant ${v}: cut id "${id}" not in screens`);
    if (seen.has(id)) err(`variant ${v}: duplicate cut id "${id}"`);
    seen.add(id);
  }
  for (const id of Object.keys(def.copy || {})) {
    if (!ids.has(id)) err(`variant ${v}: copy target "${id}" not in screens`);
    if (seen.has(id)) err(`variant ${v}: copy target "${id}" is also cut`);
  }
  if (JSON.stringify(def.secs) !== JSON.stringify(["My profile", "Activity"]))
    err(`variant ${v}: secs wrong`);
}
if (F.variants) {
  if (F.variants.b.cut.length !== 33) err('b cut count ' + F.variants.b.cut.length + ' != 33');
  if (F.variants.c.cut.length !== 38) err('c cut count ' + F.variants.c.cut.length + ' != 38');
  const bSet = new Set(F.variants.b.cut);
  for (const id of F.variants.b.cut) if (!F.variants.c.cut.includes(id)) err('c missing b cut ' + id);
  const extra = (F.variants.c.cut || []).filter(id => !bSet.has(id)).sort().join(',');
  if (extra !== 'goal_weight,height,projection_1,projection_2,weight') err('c extra cuts: ' + extra);
  // every kept variant screen keeps the capture chain
  for (const v of ['b', 'c']) {
    const kept = F.screens.filter(s => !F.variants[v].cut.includes(s.id)).map(s => s.id);
    for (const need of ['loader_plan', 'email', 'name', 'goals'])
      if (!kept.includes(need)) err(`variant ${v}: capture screen "${need}" was cut`);
  }
}
console.log(fail ? 'FAILED' : 'OK');
process.exit(fail);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd <repo>/taichi && node <scratchpad>/check-variants.js assets/config.js`
Expected: `FAIL: variants.b/.c missing` → exit 1

- [ ] **Step 3: Add the variant block to config.js**

In `assets/config.js`, after the closing `],` of `screens` (line 381) and before the final `};`, insert:

```js
  // ---- A/B/C quiz-length test (2026-07). Page sets window.QUIZ_VARIANT; app.js filters. ----
  // b: cut the whole third progress segment (Lifestyle + Health & Safety + Almost there +
  //    the untagged interim screens inside that span). c: additionally cut the body-metrics
  //    inputs and both weight-projection screens (their charts fabricate numbers without data).
  abTestName: "quiz_length_2026_07",
  variants: {
    b: {
      secs: ["My profile", "Activity"],
      cut: ["tension", "intro_stress", "water", "mood", "intro_focus", "rested", "sleep_improve",
        "intro_sleep", "diet", "produce", "intro_nutrition", "cravings", "habits", "tracker",
        "intro_brain", "medications", "mobility", "intro_safe", "menopause", "intro_menopause_weight",
        "loader", "intro_goodhands", "intro_almost", "main_reason", "motivates", "motivation_level",
        "obstacles", "intro_sustainable", "explore", "pace", "intro_paced", "intro_focus20", "daypart"],
      copy: { projection_2: { body: "Now let's create your personalized plan." } },
    },
    c: {
      secs: ["My profile", "Activity"],
      cut: ["tension", "intro_stress", "water", "mood", "intro_focus", "rested", "sleep_improve",
        "intro_sleep", "diet", "produce", "intro_nutrition", "cravings", "habits", "tracker",
        "intro_brain", "medications", "mobility", "intro_safe", "menopause", "intro_menopause_weight",
        "loader", "intro_goodhands", "intro_almost", "main_reason", "motivates", "motivation_level",
        "obstacles", "intro_sustainable", "explore", "pace", "intro_paced", "intro_focus20", "daypart",
        "height", "weight", "goal_weight", "projection_1", "projection_2"],
      copy: { intro_eligible: { blockBody: "Start seeing results in just one week and keep making steady progress toward your goal!" } },
    },
  },
```

- [ ] **Step 4: Run the check to verify it passes**

Run: `node <scratchpad>/check-variants.js assets/config.js`
Expected: `OK` → exit 0

- [ ] **Step 5: Commit**

```bash
git add assets/config.js
git commit -m "feat(quiz): variant cut-lists + copy overrides for quiz-length A/B/C test"
```

---

### Task 2: Engine variant support in app.js

**Files:**
- Modify: `assets/app.js:21-25` (`fresh()`), after `app.js:46` (insert reconciliation+filter block before the unit helpers at line 50), `app.js:56` (`SECS`), `app.js:105` (tracking)

**Interfaces:**
- Consumes: `F.abTestName`, `F.variants` (Task 1 shapes), `window.QUIZ_VARIANT` (Task 4 pages).
- Produces: `S.ab_test_name`/`S.ab_test_variant` on every session (submit-quiz already persists both); module const `VARIANT` used by tracking.

- [ ] **Step 1: Add variant fields to `fresh()`**

Replace (app.js:21-25):

```js
  function fresh() {
    return { id: uuid(), funnel: F.product, created_at: new Date().toISOString(),
      age_band: null, answers: {}, index: 0, email: null, name: null,
      height_cm: null, weight_kg: null, goal_weight_kg: null, bmi: null,
      selected_plan: null, status: "in_progress" };
  }
```

with:

```js
  const PAGE_VARIANT = String(window.QUIZ_VARIANT || "a").toLowerCase();
  function fresh() {
    return { id: uuid(), funnel: F.product, created_at: new Date().toISOString(),
      ab_test_name: F.abTestName || null, ab_test_variant: PAGE_VARIANT,
      age_band: null, answers: {}, index: 0, email: null, name: null,
      height_cm: null, weight_kg: null, goal_weight_kg: null, bmi: null,
      selected_plan: null, status: "in_progress" };
  }
```

- [ ] **Step 2: Insert reconciliation + screen filter before the SECS block**

Directly above the `// Segmented, per-section loader` comment (app.js:55), insert:

```js
  // Entry from the index/prelander always starts a brand-new quiz. This used to live in the
  // boot block at the bottom, but it must run BEFORE the variant reconciliation below —
  // otherwise a post-email user switching variants gets a session/screen-list mismatch.
  const _entry = new URLSearchParams(location.search);
  if (_entry.get("start") !== null || _entry.get("fresh") !== null || _entry.get("new") !== null) {
    S = fresh(); save();
  }
  // ---- quiz-length A/B/C: adopt/reconcile the variant, then filter the screen list.
  // Must run BEFORE _secOf/_secLen below (they're derived from F.screens).
  if (!S.ab_test_variant) {           // pre-test sessions: adopt this page's variant
    S.ab_test_name = F.abTestName || null; S.ab_test_variant = PAGE_VARIANT; save();
  } else if (S.ab_test_variant !== PAGE_VARIANT && S.status === "in_progress" && !S.email) {
    S = fresh(); save();              // switched variant mid-quiz: restart under the page's variant
  }                                   // (post-email sessions keep their recorded variant)
  const VARIANT = S.ab_test_variant;
  const VDEF = (F.variants || {})[VARIANT] || null;
  if (VDEF) {
    const _cut = new Set(VDEF.cut || []);
    F.screens = F.screens.filter(s => !_cut.has(s.id));
    Object.entries(VDEF.copy || {}).forEach(([id, patch]) => {
      const scr = F.screens.find(s => s.id === id); if (scr) Object.assign(scr, patch);
    });
  }
```

- [ ] **Step 3: Make SECS variant-aware**

Replace (app.js:56): `const SECS = ["My profile", "Activity", "Lifestyle"];`
with: `const SECS = (VDEF && VDEF.secs) || ["My profile", "Activity", "Lifestyle"];`

- [ ] **Step 4: Add variant to quiz tracking**

In app.js:105 replace `TM.track("quiz_start", {});` with `TM.track("quiz_start", { variant: VARIANT });`
and in the same line's `quiz_step` props add `variant: VARIANT,` before `i: S.index`.

- [ ] **Step 4b: Neutralize the old boot reset (now hoisted)**

At the bottom of app.js (boot block), replace:

```js
  const _qp = new URLSearchParams(location.search);
  // Entry from the index/prelander always starts a brand-new quiz.
  if (_qp.get("start") !== null || _qp.get("fresh") !== null || _qp.get("new") !== null) {
    if (window.CTC) { window.CTC.reset(); S = window.CTC.get(); }
  }
```

with:

```js
  const _qp = new URLSearchParams(location.search);
  // (?start/?fresh/?new reset moved above the variant reconciliation near the top of the file.)
```

- [ ] **Step 5: Verify variant A is unchanged and simulated B/C filter correctly**

Serve locally (`python3 -m http.server 8811 -d <repo>/taichi`) and run a Playwright check that
(a) plain `quiz.html` still has all screens and 3 sections, (b) injecting `window.QUIZ_VARIANT='b'|'c'`
via `page.addInitScript` yields filtered counts and 2 segments:

```js
// <scratchpad>/check-engine.js — run via playwright-skill run.js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  for (const v of ['a', 'b', 'c']) {
    const page = await browser.newPage();
    if (v !== 'a') await page.addInitScript((vv) => { window.QUIZ_VARIANT = vv; }, v);
    await page.goto('http://localhost:8811/quiz.html?start=1', { waitUntil: 'networkidle' });
    const r = await page.evaluate(() => ({
      n: window.FUNNEL.screens.length,
      segs: document.querySelectorAll('#progress .seg').length,
      v: window.CTC.get().ab_test_variant, name: window.CTC.get().ab_test_name,
      hasTension: window.FUNNEL.screens.some(s => s.id === 'tension'),
      hasWeight: window.FUNNEL.screens.some(s => s.id === 'weight'),
    }));
    console.log(v, JSON.stringify(r));
    await page.close();
  }
  await browser.close();
})();
```

Expected: `a` → n=70, segs=3, hasTension=true, hasWeight=true, v='a', name='quiz_length_2026_07';
`b` → n=37, segs=2, hasTension=false, hasWeight=true; `c` → n=32, hasWeight=false.
(70 = verified master count; 37/32 = 70−33/−38.)

- [ ] **Step 6: Commit**

```bash
git add assets/app.js
git commit -m "feat(quiz): engine support for URL-routed quiz-length variants"
```

---

### Task 3: Weight-free goals screen (variant C's last screen)

**Files:**
- Modify: `assets/app.js:596-603` (`rGoals`)

**Interfaces:**
- Consumes: `S.weight_kg`, `S.goal_weight_kg`, existing `personalize()`/`chartEl()`.
- Produces: nothing new — data-aware rendering, no variant coupling.

- [ ] **Step 1: Make the headline and chart conditional on weight data**

In `rGoals`, replace:

```js
    root.appendChild(el("h1", "q", personalize(`${S.name ? S.name + ", reach" : "Reach"} your goal of <span class='hl'>{goal}kg</span> by {projdate}`)));
    root.appendChild(el("p", "sub", "And build a body you feel good living in"));
    root.appendChild(chartEl());
```

with:

```js
    // Variant C has no weight data — {goal}kg/{projdate} and the weight chart would fabricate numbers.
    const hasWeight = !!(S.weight_kg && S.goal_weight_kg);
    root.appendChild(el("h1", "q", personalize(hasWeight
      ? `${S.name ? S.name + ", reach" : "Reach"} your goal of <span class='hl'>{goal}kg</span> by {projdate}`
      : `${S.name ? S.name + ", your" : "Your"} personalized plan is ready`)));
    root.appendChild(el("p", "sub", "And build a body you feel good living in"));
    if (hasWeight) root.appendChild(chartEl());
```

- [ ] **Step 2: Verify both renderings**

Extend the Task 2 Playwright run (or rerun with `?autotest=1&step=<goals step>`): on variant C the
goals screen must show "…personalized plan is ready", no `<svg>` weight chart, and the "Get My Plan"
CTA; on variant A the `{goal}kg` headline and chart must be unchanged.
Goals step number for `?step=N`: N = index of `goals` in the FILTERED list + 2 (autotest convention).

- [ ] **Step 3: Commit**

```bash
git add assets/app.js
git commit -m "feat(quiz): goals screen renders weight-free when body metrics absent"
```

---

### Task 4: quiz-b.html / quiz-c.html + cache-bust

**Files:**
- Create: `quiz-b.html`, `quiz-c.html` (copies of `quiz.html` + one line)
- Modify: `quiz.html:53-54`, and the same two lines in both new pages (`?v=58→59`, `?v=70→71`)

**Interfaces:**
- Produces: `window.QUIZ_VARIANT = "b" | "c"` set before `config.js` loads (Task 2 reads it).

- [ ] **Step 1: Create the pages**

```bash
cd <repo>/taichi
for v in b c; do
  cp quiz.html quiz-$v.html
  # inject the variant marker on the line before the config.js tag
  perl -0pi -e "s|(  <script src=\"assets/config.js)|  <script>window.QUIZ_VARIANT = \"$v\";</script>\n\$1|" quiz-$v.html
done
# bump cache-busters everywhere the two assets are loaded
perl -0pi -e 's|assets/config.js\?v=58|assets/config.js?v=59|; s|assets/app.js\?v=70|assets/app.js?v=71|' quiz.html quiz-b.html quiz-c.html
grep -n "QUIZ_VARIANT\|config.js?v\|app.js?v" quiz.html quiz-b.html quiz-c.html
```

Expected: quiz.html has no QUIZ_VARIANT line; quiz-b/c each have exactly one (with "b"/"c"); all three show `config.js?v=59` and `app.js?v=71`.

- [ ] **Step 2: Adjust the `<title>` of the new pages (optional but keeps analytics page names distinct)**

In `quiz-b.html`/`quiz-c.html` leave the `<title>` as-is — `page_view` events already carry `path`, which distinguishes variants. (Deliberate no-op; do not rename titles.)

- [ ] **Step 3: Verify pages serve and self-identify**

With the local server running: rerun the Task 2 Playwright script but navigating to
`quiz-b.html?start=1` / `quiz-c.html?start=1` directly (no addInitScript). Expected: same
b/c numbers as Task 2 Step 5, and `quiz.html?start=1` unchanged (variant a).

- [ ] **Step 4: Commit**

```bash
git add quiz.html quiz-b.html quiz-c.html
git commit -m "feat(quiz): quiz-b/quiz-c variant pages + cache-bust config/app"
```

---

### Task 5: End-to-end verification, DB assertion, ship

**Files:**
- Test: `<scratchpad>/e2e-variants.js`

**Interfaces:**
- Consumes: everything above, live `submit-quiz` edge function (unchanged).

- [ ] **Step 1: Full walk-through of variant C with one real submission**

Playwright: `quiz-c.html?start=1` → age gate → answer every screen generically (single: first
option; multi: first option + Continue; info: Continue; loader: wait) → at email enter
`claude-e2e-test-<epoch>@taimotion.com` → name "E2E Test" → goals screen (assert weight-free
headline, no chart) → "Get My Plan" → assert redirect to checkout.html and that the BMI card
(`#bmiItem`) is hidden. Assert height/weight screens never appeared (track visited screen ids
via `window.FUNNEL.screens[CTC.get().index]` sampling per step).

- [ ] **Step 2: Variant B smoke (no submission — avoids a second Slack lead ping)**

Playwright: `quiz-b.html?start=1` → walk until the email screen, asserting no Lifestyle-segment
screen ids appear and the progress bar shows 2 segments; stop at email without submitting.

- [ ] **Step 3: Variant A regression smoke**

`quiz.html?autotest=1` → lands on email step of the full 57-screen list; assert screens length
unchanged and 3 segments present on a question screen (`?autotest=1&step=5`).

- [ ] **Step 4: Assert the DB row, then clean up**

```sql
SELECT id, ab_test_name, ab_test_variant, status, email
FROM quiz_sessions WHERE email LIKE 'claude-e2e-test-%' ORDER BY created_at DESC LIMIT 3;
```

Expected: the Step-1 row with `ab_test_name = 'quiz_length_2026_07'`, `ab_test_variant = 'c'`.
Then delete test rows: `DELETE FROM quiz_sessions WHERE email LIKE 'claude-e2e-test-%'` and purge
the run's `funnel_events` by its `tm_sid` (printed by the script).

- [ ] **Step 5: Push (deploys via Cloudflare Pages) and verify live**

```bash
git push origin main
# after ~2 min (clean URLs: -L required)
curl -sL https://taimotion.com/quiz-b | grep -c 'QUIZ_VARIANT'   # expect 1
curl -sL https://taimotion.com/quiz-c | grep -c 'QUIZ_VARIANT'   # expect 1
```

- [ ] **Step 6: Report the ad URLs**

Deliverable to the user: `https://taimotion.com/quiz-b` and `https://taimotion.com/quiz-c`
(A stays `https://taimotion.com/quiz`), plus the analysis query:

```sql
SELECT ab_test_variant, count(*) AS leads,
       count(*) FILTER (WHERE status = 'paid') AS paid
FROM quiz_sessions
WHERE ab_test_name = 'quiz_length_2026_07' AND email IS NOT NULL
GROUP BY 1;
```
