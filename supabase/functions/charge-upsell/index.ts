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
    const base = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['default_payment_method'] });
    if (base.metadata?.checkout_token !== checkoutToken) return json({ error: 'bad token' }, 403);
    // Capability token is only valid briefly after checkout (bounds token-exfil misuse).
    if (Date.now() / 1000 - base.created > 1800) return json({ error: 'checkout expired' }, 403);
    const customerId = base.customer as string;
    const userId = base.metadata?.user_id as string;
    // Carry the Meta CAPI identity forward from the base checkout onto the upsell charge.
    const baseMeta = base.metadata || {};
    const upClientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '';
    const upClientUa = (req.headers.get('user-agent') || '').slice(0, 500);
    const fbMeta: Record<string, string> = {
      event_source_url: baseMeta.event_source_url || 'https://taimotion.com/',
      ...(baseMeta.fbc ? { fbc: baseMeta.fbc } : {}),
      ...(upClientIp ? { client_ip: upClientIp } : {}),
      ...(upClientUa ? { client_ua: upClientUa } : {}),
    };

    // The card is saved at the SUBSCRIPTION level (create-subscription uses
    // save_default_payment_method:'on_subscription'), which does NOT populate
    // customer.invoice_settings.default_payment_method. Read it from the subscription first, then
    // fall back to the customer default / any card on file. (The old invoice_settings-only lookup
    // made EVERY upsell fail with "no saved payment method" — test and prod alike.)
    let pm: string | undefined =
      (typeof base.default_payment_method === 'string')
        ? base.default_payment_method
        : (base.default_payment_method as Stripe.PaymentMethod | null)?.id;
    if (!pm) {
      const cust = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      pm = cust.invoice_settings?.default_payment_method as string | undefined;
    }
    if (!pm) {
      const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
      pm = list.data[0]?.id;
    }
    if (!pm) return json({ error: 'no saved payment method' }, 400);

    // TEST MODE: the base plan carries metadata.test='1' when created via the TMTEST50 test link.
    // Charge every upsell a flat $1 then (exercises the off-session charge cheaply); real customers pay full price.
    const isTest = base.metadata?.test === '1';
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
        metadata: { user_id: userId, upsell_id, ...fbMeta },
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
        metadata: { user_id: userId, upsell_id, ...fbMeta },
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
