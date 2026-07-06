/* Stripe publishable key + client helper (funnel checkout/upsell pages).
 * Publishable keys are safe in the browser. Requires https://js.stripe.com/v3/ loaded first. */
window.STRIPE_PK = "pk_live_51TpRX53x0B891G8VIlyjEN9DwOc4Zf89PRG0h9J7nVvd2JoGN10ZYU40Mx92DMnzNT6zzg29WQgGF8uYkjfSCCUc00ckMJziF1";
window.stripeClient = function () { return window.Stripe(window.STRIPE_PK); };
