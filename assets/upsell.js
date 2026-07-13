/* Shared upsell accept: charges via the charge-upsell edge fn using the checkout capability
 * token from the session, handles SCA (requires_action), records the item for the thank-you
 * summary, then navigates. Soft-fails (still advances) so a hiccup never traps the user. */
window.UPSELL = (function () {
  async function accept(upsellId, displayItem, nextUrl, btn) {
    if (btn) { btn.disabled = true; btn.dataset.t = btn.textContent; btn.textContent = "Adding…"; }
    const s = FLOW.get();
    try {
      const r = await API.chargeUpsell({ subscriptionId: s.subscriptionId, checkoutToken: s.checkoutToken, upsell_id: upsellId });
      if (r && r.status === "requires_action" && r.clientSecret && window.stripeClient) {
        try { await window.stripeClient().handleNextAction({ clientSecret: r.clientSecret }); } catch (e) { /* leave as pending */ }
      }
      const accepted = !!(r && (r.status === "accepted" || r.status === "requires_action"));
      try { if (window.TM) TM.track("upsell_accept", { id: upsellId, amount: displayItem && displayItem.amount, ok: accepted }); } catch (e) {}
      FLOW.addItem(Object.assign({ accepted }, displayItem));
    } catch (e) { /* soft-fail: don't trap the user in the funnel */ }
    location.href = nextUrl;
  }
  return { accept };
})();
