/* Tai Motion — first-party funnel analytics (SEPARATE, additive service).
 * Sends events to the isolated `log-event` function (writes only to funnel_events)
 * + GTM dataLayer + PostHog + Meta Pixel. Does NOT touch checkout / subscription / quiz-state code.
 * Public API: window.TM.track(event, props), window.TM.identify(userId), window.TM.sid()
 */
(function () {
  var URL = "https://pixtozeghxwiidpnloih.supabase.co";
  var POSTHOG_KEY = "phc_zP7yVawcZX3iQ3qRfhbvxHxz87wnDnizc66yax7bT83i"; // PostHog project API key (public, client-side)
  var POSTHOG_HOST = "https://t.taimotion.com"; // managed reverse proxy → Monokodas org, US cloud ("Tai Motion" project 525048)
  var POSTHOG_UI = "https://us.posthog.com";     // so replay/links point back to PostHog US
  var META_PIXEL_ID = "1040446045164282"; // Meta Pixel ID (public, client-side) — same pixel as the CAPI META_PIXEL_ID secret
  // TM event → Meta standard event. Purchase is deliberately absent: it is sent server-side
  // only (CAPI, event_id = Stripe object id) — a browser Purchase without that exact
  // event_id would double-count in Meta. Lead fires at email capture (the funnel's lead
  // definition) and dedups against submit-quiz's CAPI Lead via props.event_id.
  var FBQ_EVENTS = { quiz_email_captured: "Lead", pay_view: "InitiateCheckout", pay_submitted: "AddPaymentInfo" };

  function sid() {
    try {
      var s = localStorage.getItem("tm_sid");
      if (!s) { s = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem("tm_sid", s); }
      return s;
    } catch (e) { return "nosid"; }
  }
  function qp() { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(); } }
  function utm() {
    var p = qp(), o = {}, keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    keys.forEach(function (k) { var v = p.get(k); if (v) o[k] = v; });
    try {
      if (Object.keys(o).length) localStorage.setItem("tm_utm", JSON.stringify(o));
      else { var saved = localStorage.getItem("tm_utm"); if (saved) o = JSON.parse(saved) || {}; }
    } catch (e) {}
    return o;
  }
  function fbclid() {
    var v = qp().get("fbclid");
    try { if (v) localStorage.setItem("tm_fbclid", v); else v = localStorage.getItem("tm_fbclid"); } catch (e) {}
    return v || null;
  }
  function send(row) {
    try {
      var body = JSON.stringify({ events: [row] });
      var url = URL + "/functions/v1/log-event";
      // Use text/plain so the request is CORS-"simple" (no preflight) — sendBeacon can't do a
      // preflight, and the function's req.json() parses the body regardless of content-type.
      if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }))) return;
      fetch(url, { method: "POST", headers: { "Content-Type": "text/plain" }, body: body, keepalive: true, mode: "cors" });
    } catch (e) {}
  }
  function track(event, props) {
    var row = {
      session_id: sid(), user_id: window.__tm_uid || null, event: String(event),
      props: props || {}, path: (location.pathname + location.search).slice(0, 300),
      page: (document.title || "").slice(0, 60), fbclid: fbclid(), utm: utm(),
    };
    send(row);
    try { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: "tm_" + event, tm_props: row.props }); } catch (e) {}
    try { if (window.posthog && window.posthog.capture) window.posthog.capture(event, props || {}); } catch (e) {}
    try { var fe = FBQ_EVENTS[event]; if (fe && window.fbq) window.fbq("track", fe, {}, row.props.event_id ? { eventID: row.props.event_id } : undefined); } catch (e) {}
  }
  function identify(userId) {
    if (!userId) return; window.__tm_uid = userId;
    try { if (window.posthog && window.posthog.identify) window.posthog.identify(userId); } catch (e) {}
  }

  // ---- PostHog loader (only when a key is set) ----
  if (POSTHOG_KEY) {
    !function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement("script")).type = "text/javascript", p.async = !0, p.src = s.api_host + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e }, u.people.toString = function () { return u.toString(1) + ".people (stub)" }, o = "capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep".split(" "), n = 0; n < o.length; n++) g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);
    try { window.posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST, ui_host: POSTHOG_UI, defaults: "2026-05-30", person_profiles: "identified_only", capture_pageview: true }); } catch (e) {}
  }

  // ---- Meta Pixel loader (only when an ID is set) ----
  if (META_PIXEL_ID) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    try { window.fbq("init", META_PIXEL_ID); window.fbq("track", "PageView"); } catch (e) {}
  }

  window.TM = { track: track, identify: identify, sid: sid };
  // Baseline: every page fires one page_view — deferred so <title> is parsed first.
  function firePV() { try { track("page_view", { title: (document.title || "").slice(0, 80) }); } catch (e) {} }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", firePV, { once: true });
  else firePV();
})();
