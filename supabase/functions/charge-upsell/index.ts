import Stripe from 'npm:stripe@17';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
type Offer = { type: 'one_time'; amount: number } | { type: 'recurring'; price: string };
const UPSELLS: Record<string, Offer> = {
  essential_guides:         { type: 'one_time',  amount: 2599 }, // 4 Essential guides bulk (upsell1 primary)
  all_guides:               { type: 'one_time',  amount: 3899 }, // 3 Premium guides bulk (upsell2 bundle)
  essential_guides_onetime: { type: 'one_time',  amount: 1899 }, // upsell1 downsell (4 guides)
  guide_sleep:              { type: 'one_time',  amount: 1899 },
  guide_eating:             { type: 'one_time',  amount: 1899 },
  guide_aging:              { type: 'one_time',  amount: 1899 },
  vip:                      { type: 'one_time',  amount: 499  },
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { subscriptionId, checkoutToken, upsell_id } = await req.json();
    const offer = UPSELLS[upsell_id];
    if (!offer) return json({ error: 'unknown upsell' }, 400);
    if (!subscriptionId || !checkoutToken) return json({ error: 'missing checkout auth' }, 400);

    // authorize: token must match the base subscription's metadata
    const base = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['discounts'] });
    if (base.metadata?.checkout_token !== checkoutToken) return json({ error: 'bad token' }, 403);
    // Capability token is only valid briefly after checkout (bounds token-exfil misuse).
    if (Date.now() / 1000 - base.created > 1800) return json({ error: 'checkout expired' }, 403);
    const customerId = base.customer as string;
    const userId = base.metadata?.user_id as string;

    const cust = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const pm = cust.invoice_settings?.default_payment_method as string | undefined;
    if (!pm) return json({ error: 'no saved payment method' }, 400);

    // TEST MODE: if the base plan used the test coupon, charge every upsell a flat $1 (exercises
    // the off-session charge cheaply). Real customers (no test coupon) pay full price.
    const TEST_COUPON = 'YrTxIPDR';
    const isTest = ((base.discounts || []) as Array<Stripe.Discount | string>).some((d) => {
      const c = (typeof d === 'string') ? undefined : (d as Stripe.Discount).coupon;
      const id = typeof c === 'string' ? c : c?.id;
      return id === TEST_COUPON;
    });
    if (isTest) {
      const pi = await stripe.paymentIntents.create({
        amount: 100, currency: 'usd', customer: customerId,
        payment_method: pm, off_session: true, confirm: true,
        metadata: { user_id: userId, upsell_id, test: '1' },
      });
      if (pi.status === 'succeeded') return json({ status: 'accepted' });
      if (pi.status === 'requires_action') return json({ status: 'requires_action', clientSecret: pi.client_secret });
      return json({ status: 'failed' });
    }

    if (offer.type === 'one_time') {
      const pi = await stripe.paymentIntents.create({
        amount: offer.amount, currency: 'usd', customer: customerId,
        payment_method: pm, off_session: true, confirm: true,
        metadata: { user_id: userId, upsell_id },
      });
      if (pi.status === 'succeeded') return json({ status: 'accepted' });
      if (pi.status === 'requires_action') return json({ status: 'requires_action', clientSecret: pi.client_secret });
      return json({ status: 'failed' });
    } else {
      // recurring upsell = its own separate subscription (Option A), charged off-session now.
      const sub = await stripe.subscriptions.create({
        customer: customerId, items: [{ price: offer.price }],
        default_payment_method: pm, off_session: true,
        expand: ['latest_invoice.payment_intent'],
        metadata: { user_id: userId, upsell_id },
      });
      if (sub.status === 'active' || sub.status === 'trialing') return json({ status: 'accepted' });
      const pi = (sub.latest_invoice as Stripe.Invoice)?.payment_intent as Stripe.PaymentIntent | null;
      if (pi?.status === 'requires_action') return json({ status: 'requires_action', clientSecret: pi.client_secret });
      return json({ status: 'failed' });
    }
  } catch (e) {
    const err = e as Stripe.errors.StripeError & { payment_intent?: Stripe.PaymentIntent };
    if (err?.payment_intent?.client_secret)
      return json({ status: 'requires_action', clientSecret: err.payment_intent.client_secret });
    return json({ status: 'failed', error: String(err?.message || err) }, 200);
  }
});
