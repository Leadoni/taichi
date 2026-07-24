/* Chair Tai Chi funnel engine.
 * Renders FUNNEL.screens one at a time, persists answers to localStorage in a shape
 * that maps directly to the planned Supabase `quiz_sessions` row. No backend calls yet —
 * the submit hooks are stubbed (see saveSession / TODO markers) for later wiring.
 */
(function () {
  const KEY = "ctc_quiz_session";
  const F = window.FUNNEL;

  // ---- session state ----
  function uuid() {
    return (crypto.randomUUID && crypto.randomUUID()) ||
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
      });
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
  }
  const PAGE_VARIANT = String(window.QUIZ_VARIANT || "a").toLowerCase();
  function fresh() {
    return { id: uuid(), funnel: F.product, created_at: new Date().toISOString(),
      ab_test_name: F.abTestName || null, ab_test_variant: PAGE_VARIANT,
      age_band: null, answers: {}, index: 0, email: null, name: null,
      height_cm: null, weight_kg: null, goal_weight_kg: null, bmi: null,
      selected_plan: null, status: "in_progress" };
  }
  let S = load() || fresh();
  function save() { localStorage.setItem(KEY, JSON.stringify(S)); }
  // expose for checkout page + future Supabase POST
  window.CTC = {
    get: () => S,
    reset: () => { S = fresh(); save(); },
    // TODO: replace with POST to Supabase edge fn `submit-quiz` (creates quiz_sessions row)
    saveSession: () => { save(); /* await supabase.from('quiz_sessions').upsert(toRow(S)) */ },
  };

  // ---- helpers ----
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const mdInline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Render a body string into paragraphs (split on blank lines), with **bold** and muted "Source:" lines.
  function richBody(text) {
    const frag = document.createDocumentFragment();
    personalize(text).split(/\n\n+/).forEach((p) => {
      p = p.trim(); if (!p) return;
      frag.appendChild(el("p", /^Source:/i.test(p) ? "info-source" : "info-body", mdInline(p)));
    });
    return frag;
  }
  function toCm(v, u) { return u === "ft" ? Math.round(v * 30.48) : v; }      // v in ft (decimal) -> cm
  function toKg(v, u) { return u === "lb" ? +(v / 2.20462).toFixed(1) : v; }
  function bmi() { if (!S.height_cm || !S.weight_kg) return null; const m = S.height_cm / 100; return +(S.weight_kg / (m * m)).toFixed(1); }
  function bmiCategory(b) { return b < 18.5 ? "underweight" : b < 25 ? "a healthy weight" : b < 30 ? "in the overweight range" : "in the obese range"; }

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

  // Segmented, per-section loader (Digesti-style): sections, each its own segment.
  const SECS = (VDEF && VDEF.secs) || ["My profile", "Activity", "Lifestyle"];
  // quiz.html hardcodes 3 .seg spans — trim to this variant's section count.
  { const _pr = $("#progress"); if (_pr) while (_pr.children.length > SECS.length) _pr.removeChild(_pr.lastChild); }
  const SEL_DELAY = 450; // ms — let the tap register (show selected state) before auto-advancing
  const _secOf = (() => { let cur = 0; return F.screens.map(s => { const i = SECS.indexOf(s.section); if (i >= 0) cur = i; return cur; }); })();
  const _secLen = SECS.map((_, i) => _secOf.filter(x => x === i).length);
  const _secStart = SECS.map((_, i) => _secOf.indexOf(i));
  // Dev: ?debug=1 reveals the step-id chip (also: run `document.body.classList.toggle('debug')` in console).
  if (new URLSearchParams(location.search).has("debug")) { try { document.body.classList.add("debug"); } catch (e) {} }
  function setProgress() {
    const idx = Math.min(S.index, F.screens.length - 1);
    const scr = F.screens[idx];
    const si = _secOf[idx] || 0;
    const within = _secLen[si] ? Math.min(1, (idx - _secStart[si] + 1) / _secLen[si]) : 0;
    const single = si === 0;   // first section shows ONE continuous bar; later sections keep 3 segments
    const prog0 = $("#progress"); if (prog0) prog0.classList.toggle("single", single);
    document.querySelectorAll("#progress .seg > i").forEach((bar, i) => {
      const w = single ? Math.max(0, Math.min(1, within * SECS.length - i)) * 100
                       : (i < si ? 100 : i === si ? within * 100 : 0);
      bar.style.width = Math.round(w) + "%";
    });
    const sec = $("#section"); if (sec) { sec.textContent = (scr && scr.sectionLabel) || SECS[si] || ""; sec.style.display = "block"; }
    const qb = $(".qbrand"); if (qb) qb.style.display = "none";
    const pr = $("#progress"); if (pr) pr.style.display = "";
    const bk = $("#back"); if (bk) bk.style.display = "";
    const sn = $("#stepno"); if (sn) sn.textContent = scr ? ("#" + (idx + 2) + " " + scr.id) : "";
  }

  let _dir = 1;
  function go(delta) {
    _dir = delta < 0 ? -1 : 1;
    S.index = Math.max(0, Math.min(F.screens.length, S.index + delta));
    save();
    if (S.index >= F.screens.length) { window.location.href = "checkout.html"; return; }
    render();
  }
  function hidden(scr) { return scr && scr.femaleOnly && S.gender === "male"; }

  // ---- renderers ----
  function render() {
    const root = $("#step"); root.innerHTML = "";
    // skip screens that don't apply (e.g. menopause for men), honoring travel direction
    while (F.screens[S.index] && hidden(F.screens[S.index])) {
      S.index += _dir;
      if (S.index < 0) { S.index = 0; break; }
      if (S.index >= F.screens.length) { window.location.href = "checkout.html"; return; }
    }
    save();
    setProgress();
    const scr = F.screens[S.index];
    if (!scr) { window.location.href = "checkout.html"; return; }
    try { if (window.TM) { if (!window._qStarted) { window._qStarted = 1; TM.track("quiz_start", { variant: VARIANT }); } TM.track("quiz_step", { variant: VARIANT, i: S.index, id: scr.id || scr.key || scr.q || null, type: scr.type || null, section: scr.section || null }); } } catch (e) {}
    document.body.classList.toggle("scr-info", scr.type === "info");   // dark treatment for interstitials
    // Interim screens (info / loader) are full-bleed like Digesti — no progress bar, section label or back.
    const _interim = scr.type === "info" || scr.type === "loader";
    const _noBar = _interim || scr.type === "email" || scr.type === "name" || scr.type === "goals";  // capture screens: no progress bar
    { const pr = $("#progress"); if (pr) pr.style.display = _noBar ? "none" : "flex";
      const sc = $("#section"); if (sc) sc.style.display = _noBar ? "none" : "block";  // section label default is CSS none, so set block explicitly
      const bk = $("#back"); if (bk) bk.style.display = _interim ? "none" : "";
      const qb = $(".qbrand"); if (qb) qb.style.display = (scr.type === "email" || scr.type === "name") ? "inline-flex" : "none"; }
    ({ single: rSingle, multi: rMulti, input: rInput, info: rInfo,
       loader: rLoader, email: rEmail, name: rName, goals: rGoals }[scr.type] || rInfo)(scr, root);
    window.scrollTo(0, 0);
  }

  function head(scr, root) {
    if (scr.q) root.appendChild(el("h1", "q", personalize(scr.q)));
    // For ld/card-statement screens the statement is shown inside the image card, not as a box.
    if (scr.statement && scr.layout !== "ld") root.appendChild(el("div", "statement", scr.statement));
    if (scr.sub) root.appendChild(el("p", "sub", scr.sub));
  }
  function personalize(t) {
    const band = S.age_band ? S.age_band.replace(/-/, "–") : "";
    const decade = band ? band.split(/[-–]/)[0].replace(/.$/, "0") + "s" : "your age";
    const gp = S.gender === "male" ? "men" : S.gender === "female" ? "women" : "people";
    const now = S.weight_kg || 0, goal = S.goal_weight_kg || 0;
    const lose = now && goal ? Math.max(0, Math.round(now - goal)) : 0;
    const pct = now && lose ? Math.round((lose / now) * 100) : 0;
    return t.replace(/\{decade\}/g, decade).replace(/\{genderPlural\}/g, gp).replace(/\{name\}/g, S.name || "")
      .replace(/\{goal\}/g, goal || "your goal").replace(/\{now\}/g, now || "")
      .replace(/\{lose\}/g, lose).replace(/\{pct\}/g, pct).replace(/\{projdate\}/g, projDate(lose));
  }
  // A plausible target date: ~1 kg every ~2 weeks, min ~4 weeks out.
  function projDate(loseKg) {
    const weeks = Math.max(4, (loseKg || 4) * 2);
    const d = new Date(Date.now() + weeks * 7 * 86400000);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }
  // Month only (for the projection chart axis) — same dynamic estimate as projDate.
  function projMonth(loseKg) {
    const weeks = Math.max(4, (loseKg || 4) * 2);
    const d = new Date(Date.now() + weeks * 7 * 86400000);
    return d.toLocaleDateString("en-US", { month: "long" });
  }
  // Dynamic projection chart (SVG): start weight -> goal weight, "Now" + target month, all from state.
  function projChartEl(cap) {
    const now = Math.round(S.weight_kg || 92);
    const goal = Math.round(S.goal_weight_kg || Math.round((S.weight_kg || 92) * 0.85));
    const lose = Math.max(0, now - goal);
    const month = projMonth(lose);
    const green = document.documentElement.getAttribute("data-theme") === "green";
    const c1 = green ? "#45b577" : "#bf7350";
    const ink = green ? "#233e20" : "#2a2319";
    const inkL = green ? "#3c5140" : "#4a3f34";
    const muted = green ? "#7c8d79" : "#9a8f84";
    const grid = green ? "#e6ece8" : "#efe7dd";
    const box = el("div", "projchart");
    box.innerHTML = `
    <svg viewBox="18 0 306 200" width="100%" role="img" aria-label="Projected weight from ${now}kg to ${goal}kg by ${month}">
      <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c1}" stop-opacity=".28"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></linearGradient></defs>
      ${[35,140,245,310].map(x=>`<line x1="${x}" y1="30" x2="${x}" y2="168" stroke="${grid}" stroke-width="1"/>`).join("")}
      <path class="pc-area" d="M35,52 C130,60 205,132 310,150 L310,168 L35,168 Z" fill="url(#pg)"/>
      <path class="pc-line" pathLength="1" d="M35,52 C130,60 205,132 310,150" fill="none" stroke="${c1}" stroke-width="3.5" stroke-linecap="round"/>
      <text class="pc-now" x="35" y="40" font-size="18" font-weight="800" fill="${ink}">${now}kg</text>
      <g class="pc-walk" transform="translate(96,64)">
        <circle r="12" fill="${c1}"/>
        <circle cx="0" cy="-4.4" r="2.7" fill="#fff"/>
        <path d="M0,-1.2 c-3.3,0 -3.7,4 -3.7,7.6 l7.4,0 c0,-3.6 -0.4,-7.6 -3.7,-7.6 z" fill="#fff"/>
      </g>
      <text class="pc-decrease" x="182" y="49" font-size="12.5" text-anchor="middle" fill="${muted}">Decrease risk (${lose}kg)</text>
      <g class="pc-goal"><line x1="278" y1="124" x2="278" y2="140" stroke="${c1}" stroke-width="1.5"/>
      <circle cx="278" cy="140" r="5.5" fill="${c1}"/>
      <rect x="236" y="80" width="84" height="44" rx="9" fill="${c1}"/>
      <text x="278" y="98" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">Goal</text>
      <text x="278" y="117" font-size="18" font-weight="800" text-anchor="middle" fill="#fff">${goal}kg</text></g>
      <text class="pc-nowlbl" x="35" y="192" font-size="14" font-weight="700" fill="${inkL}">Now</text>
      <text class="pc-month" x="310" y="192" font-size="14" font-weight="700" text-anchor="end" fill="${inkL}">${month}</text>
    </svg>
    <div class="projchart-cap">${cap || "*Looking at Tai Motion members like you"}</div>`;
    return box;
  }

  function picsum(seed, w, h) { return `https://picsum.photos/seed/${encodeURIComponent("ctc-" + seed)}/${w}/${h}`; }
  function imgEl(cls, seed, w, h) {
    const span = el("span", cls);
    const g = document.createElement("img"); g.loading = "lazy"; g.alt = ""; g.src = picsum(seed, w, h);
    span.appendChild(g); return span;
  }
  function imgSrcEl(cls, src) {
    const span = el("span", cls);
    const g = document.createElement("img"); g.loading = "lazy"; g.alt = ""; g.src = src;
    span.appendChild(g); return span;
  }

  function optRow(scr, o, selected, onClick) {
    const row = el("button", "opt" + (selected ? " sel" : ""));
    if (scr.layout === "cards") {
      row.appendChild(o.img ? imgSrcEl("cimg", o.img) : imgEl("cimg", scr.id + "-" + o.value, 400, 300));
    } else if (scr.type === "multi" && scr.photos) {
      row.appendChild(o.img ? imgSrcEl("thumb", o.img) : imgEl("thumb", scr.id + "-" + o.value, 160, 160));
    } else if (o.emoji) {
      row.appendChild(el("span", "emoji", o.emoji));
    }
    row.appendChild(el("span", "lab", o.label));
    if (scr.type === "multi") row.appendChild(el("span", "check", selected ? "✓" : ""));
    row.onclick = () => onClick(row);
    return row;
  }

  function rSingle(scr, root) {
    head(scr, root);
    const wrapCls = scr.layout === "cards" ? "grid" : scr.layout === "ld" ? "ld" : "opts";
    if (scr.layout === "ld" && scr.statement) {
      // image card carrying the statement, shown above the option cards
      const card = el("div", "ld-card");
      const img = document.createElement("img"); img.alt = ""; img.loading = "lazy";
      img.src = scr.cardImg || picsum("ld-" + scr.id, 800, 420);
      card.appendChild(img);
      card.appendChild(el("span", "ld-label", scr.statement));
      root.appendChild(card);
    }
    const box = el("div", wrapCls);
    if (scr.layout === "ld") box.style.gridTemplateColumns = `repeat(${scr.options.length},1fr)`;
    scr.options.forEach(o => box.appendChild(optRow(scr, o, false, (row) => {
      if (box.classList.contains("locked")) return;
      box.classList.add("locked"); row.classList.add("sel");
      S.answers[scr.id] = o.value; save();
      setTimeout(() => { if (scr.safetyNote) { showSafety(scr, root); } else go(1); }, SEL_DELAY);
    })));
    root.appendChild(box);
    if (scr.figure) {
      const w = el("div", "quiz-figure");
      const img = document.createElement("img"); img.src = scr.figure; img.alt = ""; img.loading = "lazy";
      w.appendChild(img); root.appendChild(w);
    }
  }

  function showSafety(scr, root) {
    const note = el("div", "feedback", scr.safetyNote);
    root.appendChild(note);
    ctaBar("Continue", () => go(1));
  }

  function rMulti(scr, root) {
    head(scr, root);
    const cur = new Set(S.answers[scr.id] || []);
    const box = el("div", scr.layout === "cards" ? "grid cards-multi" : "opts");
    const baseOpts = scr.options.filter(o => !(o.femaleOnly && S.gender === "male"));
    const opts = baseOpts.concat(scr.noneValue ? [{ value: scr.noneValue, label: scr.noneLabel || "None", emoji: scr.noneEmoji, img: scr.noneImg }] : []);
    opts.forEach(o => {
      const sel = cur.has(o.value);
      box.appendChild(optRow(scr, o, sel, (row) => {
        if (o.value === scr.noneValue) { cur.clear(); cur.add(o.value); }
        else { cur.delete(scr.noneValue); cur.has(o.value) ? cur.delete(o.value) : cur.add(o.value); }
        S.answers[scr.id] = [...cur]; save(); render();
      }));
    });
    root.appendChild(box);
    ctaBar("Continue", () => go(1), cur.size === 0);
  }

  function rInput(scr, root) {
    head(scr, root);
    let unit = S.answers[scr.id + "_unit"] || scr.units[0];
    const wrap = el("div", "inputwrap");
    const tog = el("div", "unit-toggle");
    scr.units.forEach(u => {
      const b = el("button", u === unit ? "on" : "", u);
      b.onclick = () => { unit = u; S.answers[scr.id + "_unit"] = u; save(); rInput(scr, (root.innerHTML = "", root)); };
      tog.appendChild(b);
    });
    wrap.appendChild(tog);
    const field = el("div", "field");
    const inp = el("input"); inp.type = "number"; inp.inputMode = "decimal";
    inp.placeholder = ({ height: "Height", weight: "Current weight", goal_weight: "Goal weight" }[scr.field] || "Enter a number");
    inp.value = S.answers[scr.id] || "";
    field.appendChild(inp); field.appendChild(el("span", "u", unit));
    wrap.appendChild(field);
    const err = el("div", "input-err"); err.style.display = "none"; wrap.appendChild(err);
    const fb = el("div"); wrap.appendChild(fb);
    root.appendChild(wrap);

    function problem() {
      const v = parseFloat(inp.value);
      if (!(v > 0)) return "";
      const cm = toCm(v, unit), kg = toKg(v, unit);
      if (scr.field === "height" && (cm < 100 || cm > 220)) return "Check Your height value";
      if (scr.field === "weight" && kg >= 160) return "Check Your weight value";
      if (scr.field === "goal_weight") {
        if (kg >= 160) return "Check Your weight value";
        if (S.weight_kg && kg >= S.weight_kg) return "Your goal should be below your current weight";
      }
      return "";
    }
    function valid() { return parseFloat(inp.value) > 0 && !problem(); }
    function showErr() { const p = problem(); err.textContent = p; err.style.display = p ? "block" : "none"; }
    function commit() {
      const v = parseFloat(inp.value);
      if (v > 0) {
        S.answers[scr.id] = inp.value;
        if (scr.field === "height") S.height_cm = toCm(v, unit);
        if (scr.field === "weight") S.weight_kg = toKg(v, unit);
        if (scr.field === "goal_weight") S.goal_weight_kg = toKg(v, unit);
        S.bmi = bmi(); save();
      }
      fb.innerHTML = "";
      if (valid()) {
        if (scr.computeBMI && S.bmi)
          fb.appendChild(el("div", "feedback", `Your BMI is <b>${S.bmi}</b> — ${bmiCategory(S.bmi)}. We'll use this to set a healthy, realistic pace.`));
        if (scr.note) {
          const card = el("div", "info-block");
          if (scr.noteTitle) card.appendChild(el("div", "ib-title", scr.noteTitle));
          card.appendChild(el("div", "ib-body", scr.note));
          fb.appendChild(card);
        }
      }
    }
    const btn = inlineCta("Continue", () => { commit(); showErr(); if (valid()) go(1); }, !valid());
    inp.oninput = () => { commit(); showErr(); btn.disabled = !valid(); };
    inp.onkeydown = (e) => { if (e.key === "Enter") { commit(); showErr(); if (valid()) go(1); } };
    keepVisible(inp, btn);
    setTimeout(() => inp.focus(), 50);
  }

  function rInfo(scr, root) {
    const addTitle = () => { if (scr.title) root.appendChild(el("h1", "q", personalize(scr.title))); };
    if (scr.headerTop) addTitle();
    if (scr.lead) root.appendChild(richBody(scr.lead));
    if (scr.predict) root.appendChild(el("div", "predict", personalize(scr.predict)));
    if (scr.focusChart) { root.appendChild(focusChartEl()); }
    else if (scr.stressChart) { root.appendChild(stressChartEl()); }
    else if (scr.eligChart) { root.appendChild(eligChartEl()); }
    else if (scr.projChart) { root.appendChild(projChartEl(scr.chartCap)); }
    else if (scr.chart) { root.appendChild(chartEl()); }
    else if (scr.image) {
      const w = el("div", "info-photo" + (scr.full ? " full" : ""));
      const img = document.createElement("img"); img.src = scr.image; img.alt = ""; img.loading = "lazy";
      w.appendChild(img); root.appendChild(w);
    } else {
      root.appendChild(imgEl("info-photo", "info-" + scr.id, 800, 500));
    }
    if (!scr.headerTop) addTitle();
    if (scr.body) root.appendChild(richBody(scr.body));
    if (scr.bullets) {
      const ul = el("ul", "bullets"); scr.bullets.forEach(b => ul.appendChild(el("li", "", b))); root.appendChild(ul);
    }
    // bordered card block (like their "You only have to lose…" / eligibility note)
    if (scr.blockTitle || scr.blockBody) {
      const card = el("div", "info-block");
      if (scr.blockTitle) card.appendChild(el("div", "ib-title", personalize(scr.blockTitle)));
      if (scr.blockBody) card.appendChild(el("div", "ib-body", mdInline(personalize(scr.blockBody))));
      root.appendChild(card);
    }
    ctaBar("Continue", () => go(1));
  }
  function illustrationFor(scr) {
    const m = { intro_encourage: "🪑", intro_solution: "🌿", intro_plan: "🎯", intro_effective: "💪",
      intro_eligible: "✅", intro_safe: "🛡️", intro_home: "🏠", intro_lowdose: "⏱️", intro_stress: "🌬️",
      intro_focus: "🙂", intro_sleep: "😴", intro_nutrition: "🥗", intro_almost: "🎉", intro_sustainable: "🌱",
      intro_paced: "🎚️" };
    return m[scr.id] || "🌿";
  }
  // Results-over-time chart (Digesti-style, non-animated): 1wk -> 4wk -> 12wk, warm->green gradient, "First results" marker. No weights.
  // Cortisol (blue, falling) vs Serotonin (orange, rising) crossover chart — animated.
  // "No activity" (orange, worsens -> angry) vs "Tai Chi plan" (green, improves -> happy). Today -> After 2 weeks. Little animation.
  function focusChartEl() {
    const orange = "#E55B51", grn = "#3fae72";
    const green = document.documentElement.getAttribute("data-theme") === "green";
    const inkL = green ? "#3c5140" : "#4a3f34";
    const smooth = (pts) => { let d = `M${pts[0][0]},${pts[0][1]}`; for (let i=0;i<pts.length-1;i++){ const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||pts[i+1]; const c1x=p1[0]+(p2[0]-p0[0])/6,c1y=p1[1]+(p2[1]-p0[1])/6,c2x=p2[0]-(p3[0]-p1[0])/6,c2y=p2[1]-(p3[1]-p1[1])/6; d+=` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`; } return d; };
    const noPts = [[30,66],[88,90],[135,78],[188,108],[240,120],[312,156]];
    const tcPts = [[30,150],[95,128],[165,108],[235,84],[312,62]];
    const box = el("div", "projchart");
    box.innerHTML = `
    <svg viewBox="0 0 340 210" width="100%" role="img" aria-label="No activity worsens while the Tai Chi plan improves over two weeks">
      <line class="fc-axis" x1="24" y1="182" x2="326" y2="182" stroke="${inkL}" stroke-width="1.2"/>
      <path class="fc-line" pathLength="1" d="${smooth(noPts)}" fill="none" stroke="${orange}" stroke-width="3.5" stroke-linecap="round"/>
      <path class="fc-line" pathLength="1" d="${smooth(tcPts)}" fill="none" stroke="${grn}" stroke-width="3.5" stroke-linecap="round"/>
      <text class="fc-face" x="312" y="156" font-size="27" text-anchor="middle" dominant-baseline="central">😡</text>
      <text class="fc-face" x="312" y="62" font-size="27" text-anchor="middle" dominant-baseline="central">🥳</text>
      <g class="fc-pill"><rect x="68" y="72" width="88" height="24" rx="12" fill="${orange}"/><text x="112" y="88" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">No activity</text></g>
      <g class="fc-pill"><rect x="64" y="114" width="96" height="24" rx="12" fill="${grn}"/><text x="112" y="130" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">Tai Chi plan</text></g>
      <text class="fc-axis" x="26" y="200" font-size="12" font-weight="700" fill="${inkL}">Today</text>
      <text class="fc-axis" x="324" y="200" font-size="12" font-weight="700" text-anchor="end" fill="${inkL}">After 2 weeks</text>
    </svg>`;
    return box;
  }
  function stressChartEl() {
    const blue = "#4f74f0", orange = "#f0913a";
    const green = document.documentElement.getAttribute("data-theme") === "green";
    const inkL = green ? "#3c5140" : "#4a3f34";
    const grid = green ? "#dbe3dd" : "#e7ddd0";
    const xs = [28, 85, 142, 200, 257, 314];
    const labs = ["0min","5min","10min","15min","20min","25min"];
    const ticks = xs.map((x,i) => `<line x1="${x}" y1="46" x2="${x}" y2="172" stroke="${grid}" stroke-width="1" stroke-dasharray="3 3"/><text x="${x}" y="190" font-size="11" text-anchor="middle" fill="${inkL}">${labs[i]}</text>`).join("");
    const cortPts = [[28,56],[85,72],[142,101],[200,124],[257,139],[314,147]];
    const seroPts = [[28,147],[85,131],[142,101],[200,79],[257,64],[314,56]];
    const smooth = (pts) => { let d = `M${pts[0][0]},${pts[0][1]}`; for (let i=0;i<pts.length-1;i++){ const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||pts[i+1]; const c1x=p1[0]+(p2[0]-p0[0])/6,c1y=p1[1]+(p2[1]-p0[1])/6,c2x=p2[0]-(p3[0]-p1[0])/6,c2y=p2[1]-(p3[1]-p1[1])/6; d+=` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`; } return d; };
    const cortPath = smooth(cortPts), seroPath = smooth(seroPts);
    const dots = cortPts.filter((_,i)=>i!==2).map(([x,y]) => `<circle class="sc-dot" cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${blue}" stroke-width="2.5"/>`).join("")
      + seroPts.filter((_,i)=>i!==2).map(([x,y]) => `<circle class="sc-dot" cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${orange}" stroke-width="2.5"/>`).join("");
    const box = el("div", "projchart");
    box.innerHTML = `
    <svg viewBox="0 0 340 200" width="100%" role="img" aria-label="Cortisol falls and serotonin rises over 25 minutes of Chair Tai Chi">
      <g class="sc-axis">
        <line x1="22" y1="172" x2="326" y2="172" stroke="${inkL}" stroke-width="1.2"/>
        ${ticks}
      </g>
      <path class="sc-cort-line" pathLength="1" d="${cortPath}" fill="none" stroke="${blue}" stroke-width="3.5" stroke-linecap="round"/>
      <path class="sc-sero-line" pathLength="1" d="${seroPath}" fill="none" stroke="${orange}" stroke-width="3.5" stroke-linecap="round"/>
      ${dots}
      <circle class="sc-dot-cross" cx="142" cy="101" r="4.5" fill="#fff" stroke="#8a93a3" stroke-width="2.5"/>
      <g class="sc-cort-title">
        <text x="44" y="52" font-size="14" font-weight="800" fill="${blue}" transform="rotate(16 44 52)">Cortisol</text>
      </g>
      <g class="sc-sero-title">
        <text x="36" y="132" font-size="14" font-weight="800" fill="${orange}" transform="rotate(-16 36 132)">Serotonin</text>
      </g>
      <g class="sc-bubble">
        <circle class="sc-pulse" cx="314" cy="54" r="9" fill="${orange}" opacity=".28"/>
        <circle cx="314" cy="54" r="6" fill="${orange}"/>
      </g>
    </svg>`;
    return box;
  }
  function eligChartEl() {
    const green = document.documentElement.getAttribute("data-theme") === "green";
    const cA = "#ef955c";                       // early (warm)
    const cB = green ? "#3fae72" : "#bf7350";   // later (brand)
    const ink = green ? "#233e20" : "#2a2319";
    const inkL = green ? "#3c5140" : "#4a3f34";
    const grid = green ? "#cdd8d0" : "#e2d8cc";
    const box = el("div", "projchart");
    box.innerHTML = `
    <svg viewBox="10 0 320 192" width="100%" role="img" aria-label="Expected results from 1 to 12 weeks">
      <defs>
        <linearGradient id="egl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${cA}"/><stop offset="1" stop-color="${cB}"/></linearGradient>
        <linearGradient id="egf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${cA}" stop-opacity=".30"/><stop offset="1" stop-color="${cB}" stop-opacity=".30"/></linearGradient>
      </defs>
      <line x1="68" y1="40" x2="68" y2="152" stroke="${grid}" stroke-width="1" stroke-dasharray="3 3"/>
      <line x1="150" y1="40" x2="150" y2="152" stroke="${grid}" stroke-width="1" stroke-dasharray="3 3"/>
      <path d="M24,56 C48,52 58,56 68,62 C120,80 220,128 316,140 L316,152 L24,152 Z" fill="url(#egf)"/>
      <path d="M24,56 C48,52 58,56 68,62 C120,80 220,128 316,140" fill="none" stroke="url(#egl)" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="68" y1="42" x2="68" y2="58" stroke="${grid}" stroke-width="1"/>
      <text x="74" y="34" font-size="12.5" font-weight="700" fill="${ink}">First results</text>
      <circle cx="68" cy="62" r="5.5" fill="#fff" stroke="${cA}" stroke-width="3"/>
      <text x="62" y="176" font-size="13" font-weight="700" text-anchor="middle" fill="${inkL}">1 week</text>
      <text x="150" y="176" font-size="13" font-weight="700" text-anchor="middle" fill="${inkL}">4 weeks</text>
      <text x="316" y="176" font-size="13" font-weight="700" text-anchor="end" fill="${inkL}">12 weeks</text>
    </svg>`;
    return box;
  }
  function chartEl() {
    const now = S.weight_kg || 78, goal = S.goal_weight_kg || Math.round((S.weight_kg || 78) * 0.85);
    const green = document.documentElement.getAttribute("data-theme") === "green";
    const c1 = green ? "#45b577" : "#bf7350", c2 = green ? "#2f9d61" : "#c98a5f";  // line follows palette
    const box = el("div", "chartbox");
    box.innerHTML = `<svg viewBox="0 0 320 140" preserveAspectRatio="none">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c1}" stop-opacity=".35"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></linearGradient></defs>
      <path d="M10,30 C110,40 180,95 310,110 L310,140 L10,140 Z" fill="url(#g)"/>
      <path d="M10,30 C110,40 180,95 310,110" fill="none" stroke="${c1}" stroke-width="3"/>
      <circle cx="10" cy="30" r="5" fill="${c1}"/><circle cx="310" cy="110" r="5" fill="${c2}"/>
      </svg>
      <div class="chartlabels"><span>Now · ${now}kg</span><span>Goal · ${goal}kg</span></div>`;
    return box;
  }

  function rLoader(scr, root) {
    // Card-carousel loader: one auto-advancing step that rotates image+caption cards while a spinner runs.
    if (scr.cards) {
      const head = el("div", "loader-head");
      head.innerHTML = `<div class="spinner"></div>` +
        `<div class="lh-title">${scr.title || "Just a moment…"}</div>` +
        `<div class="lh-sub">${scr.sub || "Getting things ready for you"}</div>`;
      root.appendChild(head);
      const stage = el("div", "loader-stage"); root.appendChild(stage);
      const cards = scr.cards, per = scr.per || 1600;
      let i = 0, done = false;
      function show(idx) {
        stage.innerHTML = "";
        const c = cards[idx];
        const fig = el("div", "loader-fig");
        const img = document.createElement("img"); img.alt = "";
        img.src = c.img || picsum("load-" + idx, 640, 640); fig.appendChild(img);
        stage.appendChild(fig);
        stage.appendChild(el("p", "loader-cap", c.text || ""));
        stage.classList.remove("in"); void stage.offsetWidth; stage.classList.add("in");
      }
      show(0);
      const t = setInterval(() => {
        i++;
        if (i >= cards.length) { clearInterval(t); if (!done) { done = true; setTimeout(() => go(1), per); } return; }
        show(i);
      }, per);
      return;
    }
    // Single-message auto loader: image + title + body + progress bar, auto-advances after `per` ms.
    if (scr.body) {
      const per = scr.per || 3000;
      if (scr.image) {
        const w = el("div", "info-photo" + (scr.full ? " full" : ""));
        const im = document.createElement("img"); im.src = scr.image; im.alt = ""; w.appendChild(im); root.appendChild(w);
      }
      root.appendChild(el("h1", "q", personalize(scr.title || "")));
      root.appendChild(richBody(scr.body));
      const barWrap = el("div", "auto-bar"); const bar = el("i"); barWrap.appendChild(bar); root.appendChild(barWrap);
      requestAnimationFrame(() => { bar.style.transition = "width " + per + "ms linear"; bar.style.width = "100%"; });
      setTimeout(() => go(1), per);
      return;
    }
    // Fallback: simple progress bars (short "Almost done" style)
    root.appendChild(el("h1", "q", scr.title));
    const list = el("div", "loader-list");
    (scr.steps || []).forEach((s, i) => {
      const row = el("div", "loader-row");
      row.innerHTML = `<div class="lr-top"><span>${s}</span><span id="p${i}">0%</span></div><div class="bar"><i id="b${i}"></i></div>`;
      list.appendChild(row);
    });
    root.appendChild(list);
    // Rotating testimonials while the plan builds (stops when the loader finishes).
    let testiRot = null;
    root.appendChild(el("div", "loader-trust", "Trusted by over 163,432 clients"));
    const tcard = el("div", "loader-testi"); root.appendChild(tcard);
    const TESTI = [
      { q: "So gentle I can do it from my armchair — and I already feel steadier on my feet.", n: "Patricia, 63" },
      { q: "Ten minutes a day and my mornings aren't stiff anymore. I actually look forward to it.", n: "Margaret, 58" },
      { q: "Calmer, more energy, and my posture has improved. My friends noticed first!", n: "Sandra, 67" },
      { q: "I've tried everything — this is the only routine I've kept up. It just fits my day.", n: "Brenda, 71" },
      { q: "Less stress and I'm sleeping better. Simple moves, real results.", n: "Diane, 55" },
    ];
    let ti = 0;
    const showT = () => { const t = TESTI[ti % TESTI.length]; tcard.innerHTML = `<div class="lt-stars">★★★★★</div><p class="lt-quote">“${esc(t.q)}”</p><div class="lt-name">${esc(t.n)}</div>`; tcard.classList.remove("in"); void tcard.offsetWidth; tcard.classList.add("in"); };
    showT();
    testiRot = setInterval(() => { ti++; showT(); }, 1500);
    (scr.steps || []).forEach((s, i) => {
      let p = 0; const target = 100; const start = i * 500;
      setTimeout(() => { const t = setInterval(() => { p += 7; if (p >= target) { p = target; clearInterval(t);
        if (i === scr.steps.length - 1) { if (testiRot) { clearInterval(testiRot); testiRot = null; } setTimeout(() => go(1), 500); } }
        $("#b" + i).style.width = p + "%"; $("#p" + i).textContent = p + "%"; }, 60); }, start);
    });
  }

  // Keep the CTA visible above the mobile keyboard: scroll it into view on focus,
  // and again when the keyboard opens/closes (visualViewport resize).
  function keepVisible(inp, btn) {
    const bring = () => setTimeout(() => { try { btn.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {} }, 320);
    inp.addEventListener("focus", bring);
    if (window.visualViewport) { const h = () => bring(); window.visualViewport.addEventListener("resize", h); inp.addEventListener("blur", () => window.visualViewport.removeEventListener("resize", h), { once: true }); }
  }

  function rEmail(scr, root) {
    root.appendChild(el("h1", "q", scr.title));
    if (scr.sub) root.appendChild(el("p", "sub", scr.sub));
    const wrap = el("div", "mailwrap");
    wrap.innerHTML = '<span class="mail-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa4ad" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7.5l8.5 6 8.5-6"/></svg></span>';
    const inp = el("input", "text-field mail-input"); inp.type = "email"; inp.placeholder = "Your email address"; inp.value = S.email || "";
    wrap.appendChild(inp); root.appendChild(wrap);
    root.appendChild(el("div", "trust-badge", "\u2B50 300K users have chosen us"));
    const okEmail = (v) => /^\S+@\S+\.\S+$/.test((v || "").trim());
    root.appendChild(el("p", "consent",
      "\uD83D\uDD12 We respect your privacy and process your data exclusively in accordance with our " +
      '<a href="privacy-policy.html" target="_blank" rel="noopener">Privacy Policy</a>.'));
    const btn = inlineCta("Continue", () => {
      const v = inp.value.trim(); if (!okEmail(v)) { inp.focus(); inp.style.borderColor = "#ef6a6a"; return; }
      S.email = v; S.status = "email_captured"; window.CTC.saveSession();
      // Ship the Meta ad-click id (captured site-wide by track.js) alongside the
      // session so submit-quiz can send a CAPI Lead with fbc; S itself stays clean.
      let fb = {}; try { fb = JSON.parse(localStorage.getItem("ctc_fbc")) || {}; } catch (e) {}
      if (window.API) API.submitQuiz(Object.assign({ fbclid: fb.fbclid, fbclid_t: fb.fbclid_t }, S));
      // Browser twin of the CAPI Lead — same event_id so Meta dedups the pair.
      try { if (window.TM) TM.track("quiz_email_captured", { event_id: "lead_" + S.id }); } catch (e) {}
      // PostHog: identify by lowercased email — the members' app identifies the same
      // way at login, so pre-purchase and in-app activity merge into one person.
      try { if (window.posthog && window.posthog.identify) posthog.identify(v.toLowerCase(), { email: v }); } catch (e) {}
      go(1);
    }, !okEmail(S.email));
    inp.oninput = () => { btn.disabled = !okEmail(inp.value); inp.style.borderColor = ""; };
    keepVisible(inp, btn);
    setTimeout(() => inp.focus(), 50);
  }

  function rName(scr, root) {
    root.appendChild(el("h1", "q", scr.title));
    const inp = el("input", "text-field"); inp.type = "text"; inp.placeholder = "First name";
    inp.value = S.name || ""; root.appendChild(inp);
    const btn = inlineCta("Continue", () => { const v = inp.value.trim(); if (!v) { inp.focus(); return; } S.name = v; save(); go(1); });
    keepVisible(inp, btn);
    setTimeout(() => inp.focus(), 50);
  }

  function rGoals(scr, root) {
    const pr = $("#progress"); if (pr) pr.style.display = "none";     // full-bleed like Digesti — no loader/topbar
    const sc = $("#section"); if (sc) sc.style.display = "none";
    const bk = $("#back"); if (bk) bk.style.display = "none";
    // Variant C has no weight data — {goal}kg/{projdate} and the weight chart would fabricate numbers.
    const hasWeight = !!(S.weight_kg && S.goal_weight_kg);
    root.appendChild(el("h1", "q", personalize(hasWeight
      ? `${S.name ? S.name + ", reach" : "Reach"} your goal of <span class='hl'>{goal}kg</span> by {projdate}`
      : `${S.name ? S.name + ", your" : "Your"} personalized plan is ready`)));
    root.appendChild(el("p", "sub", "And build a body you feel good living in"));
    if (hasWeight) root.appendChild(chartEl());
    const block = el("div", "goal-block");
    [["\uD83C\uDFCB\uFE0F", "Slim down and tone up with gentle but effective workouts"],
     ["\uD83E\uDE91", "Gentle seated workouts — no equipment needed"],
     ["\uD83E\uDD57", "Customized nutrition suggestions for better results"],
     ["\uD83D\uDCAC", "24/7 personalized wellness assistant"]].forEach(([ic, t]) => {
       const row = el("div", "goal-row");
       row.appendChild(el("span", "gr-ic", ic));
       row.appendChild(el("span", "gr-tx", t));
       block.appendChild(row);
     });
    root.appendChild(block);
    S.status = "completed"; window.CTC.saveSession();
    const cta = el("div", "goal-cta");
    const b = el("button", "btn", "Get My Plan"); b.onclick = () => { window.location.href = "checkout.html"; };
    cta.appendChild(b); root.appendChild(cta);
  }

  // ---- sticky CTA ----
  function ctaBar(label, onClick, disabled) {
    const bar = el("div", "cta-bar");
    const inner = el("div", "cta-inner");
    const b = el("button", "btn", label); b.disabled = !!disabled; b.onclick = onClick;
    inner.appendChild(b); bar.appendChild(inner); $("#step").appendChild(bar);
    return b;
  }

  // Inline CTA (in normal flow, right under the input) — stays visible above the mobile keyboard.
  function inlineCta(label, onClick, disabled) {
    const wrap = el("div", "inline-cta");
    const b = el("button", "btn", label); b.disabled = !!disabled; b.onclick = onClick;
    wrap.appendChild(b); $("#step").appendChild(wrap);
    return b;
  }

  // Shared gate renderer: chevron rows + optional figure beside the options (matches their age gate).
  function gateScreen(title, label, rows, onPick, figureSrc, showConsent, showPill) {
    const root = $("#step"); root.innerHTML = "";
    document.body.classList.remove("scr-info");
    document.querySelectorAll("#progress .seg > i").forEach(i => i.style.width = "0%");
    const sec = $("#section"); if (sec) sec.style.display = "none";
    const qb = $(".qbrand"); if (qb) qb.style.display = "inline-flex";
    const pr = $("#progress"); if (pr) pr.style.display = "none";   // no loader on the age gate
    const bk = $("#back"); if (bk) bk.style.display = "none";        // centered logo, like the reference
    if (showPill) {
      const pill = el("div", "gate-pill");
      pill.innerHTML = '<span class="gp-ic">🎁</span><span class="gp-tx">Take the quiz — get your <b>PDF Guide!</b></span>';
      root.appendChild(pill);
    }
    root.appendChild(el("h1", "q gate-title", title));
    const box = el("div", "opts");
    if (label) box.appendChild(el("div", "opts-label", label));
    rows.forEach(([val, lbl]) => {
      const row = el("button", "opt gate-opt");
      row.appendChild(el("span", "lab", lbl));
      row.appendChild(el("span", "chev", "›"));
      row.onclick = () => {
        if (box.classList.contains("locked")) return;
        box.classList.add("locked"); row.classList.add("sel");
        setTimeout(() => onPick(val), SEL_DELAY);
      };
      box.appendChild(row);
    });
    if (figureSrc) {
      // two-column: figure left, options right (stays side-by-side on mobile)
      const cols = el("div", "gate-2col");
      const fig = el("div", "gate-fig");
      const img = document.createElement("img"); img.src = figureSrc; img.alt = ""; fig.appendChild(img);
      cols.appendChild(fig); cols.appendChild(box);
      root.appendChild(cols);
    } else {
      root.appendChild(box);
    }
    if (showConsent) {
      const c = el("p", "consent gate-consent");
      c.innerHTML = 'By choosing your age and continuing you agree to our ' +
        '<a href="terms-of-services.html" target="_blank" rel="noopener">Terms of Service</a> | ' +
        '<a href="privacy-policy.html" target="_blank" rel="noopener">Privacy Policy</a>. Please review before continuing';
      root.appendChild(c);
    }
  }

  // (gender gate removed — funnel is female-only; age is the first gate)

  // ---- age gate (second screen of the quiz) ----
  function ageGate() {
    gateScreen("Chair Tai Chi Workouts", "Select your age",
      [["40-49", "40-49"], ["50-59", "50-59"], ["60-69", "60-69"], ["70-80", "70-80"]],
      (val) => { S.age_band = val; S.index = 0; S.status = "in_progress"; save(); render(); }, "assets/1f_age.webp", true, true);
    const sn = $("#stepno"); if (sn) sn.textContent = "#1 age";
  }

  // ---- QA shortcut: auto-answer everything and jump to checkout ----
  // Usage: quiz.html?autotest=1  (also accepts ?test=1 or ?funnel=test, optional &email=)
  function autotestFill() {
    const qp = new URLSearchParams(location.search);
    const ages = ["40-49", "50-59", "60-69", "70-80"];
    S = window.CTC ? (window.CTC.reset(), window.CTC.get()) : S;
    S.gender = "female"; // female-only funnel
    S.age_band = ages[Math.floor(Math.random() * ages.length)];
    S.funnel = "chair-taichi"; S.status = "checkout";
    S.height_cm = 158 + Math.floor(Math.random() * 22);
    S.weight_kg = 62 + Math.floor(Math.random() * 38);
    S.goal_weight_kg = Math.max(50, S.weight_kg - (5 + Math.floor(Math.random() * 12)));
    S.bmi = +(S.weight_kg / Math.pow(S.height_cm / 100, 2)).toFixed(1);
    if (qp.get("email")) S.email = qp.get("email");
    S.selected_plan = "4w"; S.answers = {};
    const rnd = (a) => a[Math.floor(Math.random() * a.length)];
    FUNNEL.screens.forEach(scr => {
      if (scr.femaleOnly && S.gender === "male") return;       // skip female-only screens for men
      if (scr.type === "single") S.answers[scr.id] = rnd(scr.options).value;
      else if (scr.type === "multi") { const opts = scr.options.filter(o => !(o.femaleOnly && S.gender === "male")); const n = 1 + Math.floor(Math.random() * Math.min(2, opts.length)); S.answers[scr.id] = [...opts].sort(() => Math.random() - 0.5).slice(0, n).map(o => o.value); }
      else if (scr.type === "input") S.answers[scr.id] = String(scr.field === "height" ? S.height_cm : scr.field === "weight" ? S.weight_kg : S.goal_weight_kg);
    });
    // Target: ?step=N (matches the header step tag, N = index+2). Default = email capture step.
    const stepParam = qp.get("step") || qp.get("goto");
    let target;
    if (stepParam != null && stepParam !== "") {
      target = Math.max(0, Math.min(FUNNEL.screens.length - 1, parseInt(stepParam, 10) - 2));
    } else {
      const emailIdx = FUNNEL.screens.findIndex(s => s.type === "email");
      target = emailIdx >= 0 ? emailIdx : 0;
    }
    S.index = target; S.status = "in_progress"; save();
    render();
  }

  // ---- back button + boot ----
  const back = $("#back"); if (back) back.onclick = () => {
    if (!S.age_band) { window.location.href = "index.html"; return; }
    if (S.index === 0) { S.age_band = null; save(); ageGate(); return; }
    go(-1);
  };
  const _qp = new URLSearchParams(location.search);
  // (?start/?fresh/?new reset moved above the variant reconciliation near the top of the file.)
  if (_qp.get("autotest") !== null || _qp.get("test") !== null || _qp.get("funnel") === "test"
      || _qp.get("step") !== null || _qp.get("goto") !== null) autotestFill();
  else { S.gender = "female"; save(); if (!S.age_band) ageGate(); else render(); }  // female-only: gender step removed
})();
