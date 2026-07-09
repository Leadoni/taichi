/* Tai Motion — shared theme engine (funnel).
 * Default = brown. ?t=g -> green, ?t=b -> brown. Choice persists via:
 *   1) cookie on .taimotion.com  (shared across taimotion.com + app.taimotion.com)
 *   2) localStorage              (per-origin fallback)
 * so a green (or brown) journey carries end-to-end: landing -> quiz -> checkout -> app.
 * Enterable at any page via ?t=. Loaded synchronously in <head> to avoid a color flash.
 */
(function () {
  try {
    var COOKIE = "tm_theme";
    function readCookie() {
      var m = document.cookie.match(/(?:^|;\s*)tm_theme=(green|brown)/);
      return m ? m[1] : null;
    }
    function writeCookie(v) {
      // domain=.taimotion.com => shared with the app subdomain. Harmless on other hosts.
      var base = "; path=/; max-age=31536000; samesite=lax";
      document.cookie = COOKIE + "=" + v + base;
      var h = location.hostname;
      if (/taimotion\.com$/.test(h)) document.cookie = COOKIE + "=" + v + "; domain=.taimotion.com" + base;
    }

    var p = new URLSearchParams(location.search).get("t");
    var theme;
    if (p === "g" || p === "b") {
      theme = p === "g" ? "green" : "brown";
      writeCookie(theme);
      try { localStorage.setItem(COOKIE, theme); } catch (e) {}
    } else {
      theme = readCookie() || (function () { try { return localStorage.getItem(COOKIE); } catch (e) { return null; } })() || "green";
    }

    window.TM_THEME = theme;
    document.documentElement.setAttribute("data-theme", theme);

    // Append ?t=g to a URL when green is active (used for cross-origin app links).
    window.TM_URL = function (url) {
      if (theme !== "brown" || !url) return url;
      if (/[?&]t=/.test(url)) return url;
      return url + (url.indexOf("?") > -1 ? "&" : "?") + "t=b";
    };

    var onReady = function () {
      var green = theme === "green";
      // Swap logos: green uses logo.webp (old green mark), brown uses logo2.webp.
      document.querySelectorAll("img").forEach(function (i) {
        var s = i.getAttribute("src") || "";
        if (/logo2?\.webp/.test(s)) i.setAttribute("src", green ? "assets/logo.webp" : "assets/logo2.webp");
      });
      // Carry the theme across the domain hop to the app on any static link.
      document.querySelectorAll('a[href*="app.taimotion.com"]').forEach(function (a) {
        a.setAttribute("href", window.TM_URL(a.getAttribute("href")));
      });
    };
    if (document.readyState !== "loading") onReady();
    else document.addEventListener("DOMContentLoaded", onReady);
  } catch (e) {}
})();
