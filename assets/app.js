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
  function fresh() {
    return { id: uuid(), funnel: F.product, created_at: new Date().toISOString(),
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
  function toCm(v, u) { return u === "ft" ? Math.round(v * 30.48) : v; }      // v in ft (decimal) -> cm
  function toKg(v, u) { return u === "lb" ? +(v / 2.20462).toFixed(1) : v; }
  function bmi() { if (!S.height_cm || !S.weight_kg) return null; const m = S.height_cm / 100; return +(S.weight_kg / (m * m)).toFixed(1); }
  function bmiCategory(b) { return b < 18.5 ? "underweight" : b < 25 ? "a healthy weight" : b < 30 ? "in the overweight range" : "in the obese range"; }

  // screens excluding the capture trio for progress math
  const total = F.screens.length;
  function setProgress() {
    const pct = Math.min(100, Math.round((S.index) / total * 100));
    const bar = $("#progress > i"); if (bar) bar.style.width = pct + "%";
    const scr = F.screens[S.index];
    const sec = $("#section"); if (sec) sec.textContent = (scr && scr.section) || "";
    // TEMP step indicator: matches the screenshot numbering (their #1 = age gate)
    const sn = $("#stepno"); if (sn) sn.textContent = scr ? ("#" + (S.index + 2) + " " + scr.id) : "";
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
    scr.options.forEach(o => box.appendChild(optRow(scr, o, false, () => {
      S.answers[scr.id] = o.value; save();
      if (scr.safetyNote) { showSafety(scr, root); }
      else go(1);
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
    const fb = el("div"); wrap.appendChild(fb);
    root.appendChild(wrap);

    function valid() { const v = parseFloat(inp.value); return v > 0; }
    function commit() {
      const v = parseFloat(inp.value); if (!v) return;
      S.answers[scr.id] = inp.value;
      if (scr.field === "height") S.height_cm = toCm(v, unit);
      if (scr.field === "weight") S.weight_kg = toKg(v, unit);
      if (scr.field === "goal_weight") S.goal_weight_kg = toKg(v, unit);
      S.bmi = bmi(); save();
      if (scr.computeBMI && S.bmi) {
        fb.innerHTML = "";
        fb.appendChild(el("div", "feedback", `Your BMI is <b>${S.bmi}</b> — ${bmiCategory(S.bmi)}. We'll use this to set a healthy, realistic pace.`));
      }
      if (scr.note) {
        fb.innerHTML = "";
        const card = el("div", "info-block");
        if (scr.noteTitle) card.appendChild(el("div", "ib-title", scr.noteTitle));
        card.appendChild(el("div", "ib-body", scr.note));
        fb.appendChild(card);
      }
    }
    const btn = inlineCta("Continue", () => { commit(); if (valid()) go(1); }, !valid());
    inp.oninput = () => { commit(); btn.disabled = !valid(); };
    inp.onkeydown = (e) => { if (e.key === "Enter" && valid()) { commit(); go(1); } };
    keepVisible(inp, btn);
    setTimeout(() => inp.focus(), 50);
  }

  function rInfo(scr, root) {
    const addTitle = () => { if (scr.title) root.appendChild(el("h1", "q", personalize(scr.title))); };
    if (scr.headerTop) addTitle();
    if (scr.chart) { root.appendChild(chartEl()); }
    else if (scr.image) {
      const w = el("div", "info-photo" + (scr.full ? " full" : ""));
      const img = document.createElement("img"); img.src = scr.image; img.alt = ""; img.loading = "lazy";
      w.appendChild(img); root.appendChild(w);
    } else {
      root.appendChild(imgEl("info-photo", "info-" + scr.id, 800, 500));
    }
    if (!scr.headerTop) addTitle();
    if (scr.body) root.appendChild(el("p", "info-body", personalize(scr.body)));
    if (scr.bullets) {
      const ul = el("ul", "bullets"); scr.bullets.forEach(b => ul.appendChild(el("li", "", b))); root.appendChild(ul);
    }
    // bordered card block (like their "You only have to lose…" / eligibility note)
    if (scr.blockTitle || scr.blockBody) {
      const card = el("div", "info-block");
      if (scr.blockTitle) card.appendChild(el("div", "ib-title", personalize(scr.blockTitle)));
      if (scr.blockBody) card.appendChild(el("div", "ib-body", personalize(scr.blockBody)));
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
  function chartEl() {
    const now = S.weight_kg || 78, goal = S.goal_weight_kg || Math.round((S.weight_kg || 78) * 0.85);
    const box = el("div", "chartbox");
    box.innerHTML = `<svg viewBox="0 0 320 140" preserveAspectRatio="none">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5a9e6f" stop-opacity=".35"/><stop offset="1" stop-color="#5a9e6f" stop-opacity="0"/></linearGradient></defs>
      <path d="M10,30 C110,40 180,95 310,110 L310,140 L10,140 Z" fill="url(#g)"/>
      <path d="M10,30 C110,40 180,95 310,110" fill="none" stroke="#5a9e6f" stroke-width="3"/>
      <circle cx="10" cy="30" r="5" fill="#5a9e6f"/><circle cx="310" cy="110" r="5" fill="#ef6a6a"/>
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
      root.appendChild(el("p", "info-body", personalize(scr.body)));
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
    (scr.steps || []).forEach((s, i) => {
      let p = 0; const target = 100; const start = i * 500;
      setTimeout(() => { const t = setInterval(() => { p += 7; if (p >= target) { p = target; clearInterval(t);
        if (i === scr.steps.length - 1) setTimeout(() => go(1), 500); }
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
    root.appendChild(el("div", "info-ill", "📋"));
    root.appendChild(el("h1", "q", scr.title));
    root.appendChild(el("p", "sub", scr.sub));
    const inp = el("input", "text-field"); inp.type = "email"; inp.placeholder = "you@example.com";
    inp.value = S.email || ""; root.appendChild(inp);
    const btn = inlineCta("See my plan", () => {
      const v = inp.value.trim(); if (!/^\S+@\S+\.\S+$/.test(v)) { inp.focus(); inp.style.borderColor = "#ef6a6a"; return; }
      S.email = v; S.status = "email_captured"; window.CTC.saveSession();
      if (window.API) API.submitQuiz(S);   // save lead to Supabase (quiz_sessions)
      go(1);
    });
    root.appendChild(el("p", "consent",
      "By continuing you agree to receive emails about your plan. You can unsubscribe anytime. See our Terms and Privacy Policy."));
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
    const goal = S.goal_weight_kg || "—", now = S.weight_kg || "—";
    root.appendChild(el("h1", "q", `${S.name ? S.name + ", your" : "Your"} plan is ready`));
    root.appendChild(chartEl());
    const ul = el("ul", "bullets goals-bullets");
    ["A personalized seated Chair Tai Chi routine",
     "Short, joint-friendly daily sessions",
     "Balance, mobility and gentle strength work",
     "Progress tracking and simple nutrition tips",
     "A 24/7 wellness assistant for questions"].forEach(b => ul.appendChild(el("li", "", b)));
    root.appendChild(ul);
    S.status = "completed"; window.CTC.saveSession();
    ctaBar("Get my plan", () => { window.location.href = "checkout.html"; });
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
  function gateScreen(title, subtitle, rows, onPick, figureSrc) {
    const root = $("#step"); root.innerHTML = "";
    const bar = $("#progress > i"); if (bar) bar.style.width = "0%";
    const sec = $("#section"); if (sec) sec.textContent = "";
    root.appendChild(el("div", "gate-pill", "🎁 Take the quiz — get your free plan"));
    root.appendChild(el("h1", "q gate-title", title));
    root.appendChild(el("p", "sub", subtitle));
    const box = el("div", "opts");
    rows.forEach(([val, label]) => {
      const row = el("button", "opt gate-opt");
      row.appendChild(el("span", "lab", label));
      row.appendChild(el("span", "chev", "›"));
      row.onclick = () => onPick(val);
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
    root.appendChild(el("p", "consent",
      "By continuing you agree to our Terms of Service and Privacy Policy."));
  }

  // ---- gender gate (very first screen of the quiz) ----
  function genderGate() {
    gateScreen("Chair Tai Chi Workouts", "Select your gender to get your free personalized plan",
      [["female", "Female"], ["male", "Male"]],
      (val) => { S.gender = val; save(); ageGate(); });
    const sn = $("#stepno"); if (sn) sn.textContent = "#0 gender";
  }

  // ---- age gate (second screen of the quiz) ----
  function ageGate() {
    gateScreen("Chair Tai Chi Workouts", "Select your age to get your free personalized plan",
      [["40-49", "Age 40–49"], ["50-59", "Age 50–59"], ["60-69", "Age 60–69"], ["70-80", "Age 70–80"]],
      (val) => { S.age_band = val; S.index = 0; S.status = "in_progress"; save(); render(); },
      "assets/1_age.webp");
    const sn = $("#stepno"); if (sn) sn.textContent = "#1 age";
  }

  // ---- QA shortcut: auto-answer everything and jump to checkout ----
  // Usage: quiz.html?autotest=1  (also accepts ?test=1 or ?funnel=test, optional &email=)
  function autotestFill() {
    const qp = new URLSearchParams(location.search);
    const ages = ["40-49", "50-59", "60-69", "70-80"];
    S = window.CTC ? (window.CTC.reset(), window.CTC.get()) : S;
    S.gender = Math.random() < 0.5 ? "female" : "male";
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
    // jump straight to the email capture step (then name -> goals -> checkout work as normal)
    const emailIdx = FUNNEL.screens.findIndex(s => s.type === "email");
    S.index = emailIdx >= 0 ? emailIdx : 0; S.status = "in_progress"; save();
    render();
  }

  // ---- back button + boot ----
  const back = $("#back"); if (back) back.onclick = () => {
    if (!S.gender) { window.location.href = "index.html"; return; }
    if (!S.age_band) { S.gender = null; save(); genderGate(); return; }
    if (S.index === 0) { S.age_band = null; save(); ageGate(); return; }
    go(-1);
  };
  const _qp = new URLSearchParams(location.search);
  // Entry from the index/prelander always starts a brand-new quiz.
  if (_qp.get("start") !== null || _qp.get("fresh") !== null || _qp.get("new") !== null) {
    if (window.CTC) { window.CTC.reset(); S = window.CTC.get(); }
  }
  if (_qp.get("autotest") !== null || _qp.get("test") !== null || _qp.get("funnel") === "test") autotestFill();
  else if (!S.gender) genderGate(); else if (!S.age_band) ageGate(); else render();
})();
