import Stripe from 'npm:stripe@17';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
type Offer = { type: 'one_time'; amount: number } | { type: 'recurring'; price: string };
const UPSELLS: Record<string, Offer> = {
  essential_guides:         { type: 'recurring', price: 'price_1Tq7L7EKxtNHIkyEi3VZYxCJ' }, // $9.99/mo
  all_guides:               { type: 'recurring', price: 'price_1Tq7L7EKxtNHIkyE7kbWBgwe' }, // $19.99/mo
  essential_guides_onetime: { type: 'one_time',  amount: 999  },
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
    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return json({ error: 'unauthenticated' }, 401);

    const { upsell_id } = await req.json();
    const offer = UPSELLS[upsell_id];
    if (!offer) return json({ error: 'unknown upsell' }, 400);

    const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data: row } = await svc.from('users').select('stripe_customer_id').eq('id', user.id).maybeSingle();
    const customerId = row?.stripe_customer_id as string | null;
    if (!customerId) return json({ error: 'no customer' }, 400);
    const cust = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const pm = cust.invoice_settings?.default_payment_method as string | undefined;
    if (!pm) return json({ error: 'no saved payment method' }, 400);

    if (offer.type === 'one_time') {
      const pi = await stripe.paymentIntents.create({
        amount: offer.amount, currency: 'usd', customer: customerId,
        payment_method: pm, off_session: true, confirm: true,
        metadata: { user_id: user.id, upsell_id },
      });
      if (pi.status === 'succeeded') return json({ status: 'accepted' });
      if (pi.status === 'requires_action') return json({ status: 'requires_action', clientSecret: pi.client_secret });
      return json({ status: 'failed' });
    } else {
      // Option A: recurring upsell is its OWN separate subscription on the customer, charged off-session now.
      const sub = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: offer.price }],
        default_payment_method: pm,
        off_session: true,
        expand: ['latest_invoice.payment_intent'],
        metadata: { user_id: user.id, upsell_id },
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
