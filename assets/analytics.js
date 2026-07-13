/* Tai Motion — first-party funnel analytics (SEPARATE, additive service).
 * Sends events to the isolated `log-event` function (writes only to funnel_events)
 * + GTM dataLayer + PostHog. Does NOT touch checkout / subscription / quiz-state code.
 * Public API: window.TM.track(event, props), window.TM.identify(userId), window.TM.sid()
 */
(function () {
  var URL = "https://pixtozeghxwiidpnloih.supabase.co";
  var POSTHOG_KEY = "";                         // set to your PostHog project key to enable replay/funnels
  var POSTHOG_HOST = "https://eu.i.posthog.com"; // change to us.i.posthog.com if your project is US

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
      // log-event is deployed --no-verify-jwt, so no apikey header is required (works with sendBeacon).
      if (navigator.sendBeacon) navigator.sendBeacon(URL + "/functions/v1/log-event", new Blob([body], { type: "application/json" }));
      else fetch(URL + "/functions/v1/log-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true });
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
  }
  function identify(userId) {
    if (!userId) return; window.__tm_uid = userId;
    try { if (window.posthog && window.posthog.identify) window.posthog.identify(userId); } catch (e) {}
  }

  // ---- PostHog loader (only when a key is set) ----
  if (POSTHOG_KEY) {
    !function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement("script")).type = "text/javascript", p.async = !0, p.src = s.api_host + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e }, u.people.toString = function () { return u.toString(1) + ".people (stub)" }, o = "capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep".split(" "), n = 0; n < o.length; n++) g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);
    try { window.posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST, person_profiles: "identified_only", capture_pageview: true }); } catch (e) {}
  }

  window.TM = { track: track, identify: identify, sid: sid };
  // Baseline: every page that loads this fires a page_view — gives page-level funnel for free.
  try { track("page_view", { title: (document.title || "").slice(0, 80) }); } catch (e) {}
})();
