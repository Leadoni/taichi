/* Test-mode helper: shows a "Reset quiz" pill on every funnel page while in test mode.
 * Test mode turns on when you arrive with ?autotest / ?test / ?funnel=test, and persists
 * (localStorage flag) across the rest of the funnel pages. Reset clears the saved quiz
 * session and returns to the start — no cookie-clearing needed.
 */
(function () {
  try {
    var inTest = localStorage.getItem("ctc_test") === "1" ||
      /[?&](autotest|test)=/.test(location.search) || /[?&]funnel=test/.test(location.search);
    if (!inTest) return;
    localStorage.setItem("ctc_test", "1");
    function add() {
      if (document.getElementById("ctc-testbar")) return;
      var b = document.createElement("button");
      b.id = "ctc-testbar"; b.className = "testbar";
      b.textContent = "↻ Reset quiz (test)";
      b.onclick = function () {
        try { localStorage.removeItem("ctc_quiz_session"); } catch (e) {}
        location.href = "index.html";   // back to the funnel start (keeps test mode on)
      };
      document.body.appendChild(b);
    }
    if (document.body) add(); else document.addEventListener("DOMContentLoaded", add);
  } catch (e) {}
})();
