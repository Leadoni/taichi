/* Stripe publishable key + client helper (funnel checkout/upsell pages).
 * Publishable keys are safe in the browser. Requires https://js.stripe.com/v3/ loaded first. */
window.STRIPE_PK = "pk_test_51Tq6eVEKxtNHIkyEH26s3Yb09P17pwsgrnl3e8ylSrOGhv2ODsw4mVh2IU3Nycl2vSY9afNCWSD0QHJubdo64Fos00roD8Yf2g";
window.stripeClient = function () { return window.Stripe(window.STRIPE_PK); };
