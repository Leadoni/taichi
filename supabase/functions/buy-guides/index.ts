// In-app guide purchase for existing members.
// Authorized by the member's Supabase session (JWT) — no post-checkout token needed.
// Charges the saved card off-session; if that needs a card/authentication it returns a
// clientSecret so the app can show a Stripe payment popup. Records the entitlement.
import Stripe from 'npm:stripe@17';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const PK = 'pk_live_51TpRX53x0B891G8VIlyjEN9DwOc4Zf89PRG0h9J7nVvd2JoGN10ZYU40Mx92DMnzNT6zzg29WQgGF8uYkjfSCCUc00ckMJziF1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

// one-time in-app prices (cents) + the entitlement id granted.
// App pricing: single guide $18.99, group bundle $38.99 (independent of the funnel upsell prices).
const OFFERS: Record<string, { amount: number; grant: string }> = {
  essential_guides:        { amount: 3899, grant: 'essential_guides' },
  all_guides:              { amount: 3899, grant: 'all_guides' },
  'guide_joint-mobility':  { amount: 1899, grant: 'guide_joint-mobility' },
  'guide_breathing':       { amount: 1899, grant: 'guide_breathing' },
  'guide_nutrition':       { amount: 1899, grant: 'guide_nutrition' },
  'guide_desserts':        { amount: 1899, grant: 'guide_desserts' },
  'guide_sleep':           { amount: 1899, grant: 'guide_sleep' },
  'guide_eating':          { amount: 1899, grant: 'guide_eating' },
  'guide_aging':           { amount: 1899, grant: 'guide_aging' },
};
// which group bundle covers a single guide (so bundle owners aren't charged for singles)
const GROUP_OF: Record<string, string> = {
  'guide_joint-mobility': 'essential_guides', 'guide_breathing': 'essential_guides',
  'guide_nutrition': 'essential_guides', 'guide_desserts': 'essential_guides',
  'guide_sleep': 'all_guides', 'guide_eating': 'all_guides', 'guide_aging': 'all_guides',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json();
    const key = (body.item || body.bundle) as string;
    const cfg = OFFERS[key];
    if (!cfg) return json({ status: 'error', error: 'unknown item' }, 400);

    // verify the member's session
    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }, auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ status: 'error', error: 'not signed in' }, 401);

    const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

    // already owns it? never double-charge (owns the item directly, OR owns the group bundle that includes it)
    const { data: pays } = await svc.from('payments').select('kind,amount').eq('user_id', user.id);
    const kinds = new Set((pays || []).map((p) => p.kind));
    const groupBundle = GROUP_OF[key];
    if (kinds.has('upsell:' + cfg.grant) || (groupBundle && kinds.has('upsell:' + groupBundle)))
      return json({ status: 'already_owned', upsell_id: cfg.grant });

    const { data: urow } = await svc.from('users').select('stripe_customer_id').eq('id', user.id).maybeSingle();
    const customerId = urow?.stripe_customer_id as string | undefined;
    if (!customerId) return json({ status: 'error', error: 'no billing account on file' }, 400);

    // TEST MODE: members whose initial charge was <= $1 (test promo) pay $1 for upsells too.
    const initial = (pays || []).find((p) => p.kind === 'initial');
    const isTest = initial != null && Number(initial.amount) <= 1;
    const amount = isTest ? 100 : cfg.amount;
    const meta: Record<string, string> = { user_id: user.id, upsell_id: cfg.grant };
    if (isTest) meta.test = '1';

    const cust = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    let pm = cust.invoice_settings?.default_payment_method as string | undefined;
    if (!pm) {
      const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
      pm = list.data[0]?.id;
    }

    // no card on file -> hand the app a PaymentIntent to collect one (popup)
    if (!pm) {
      const pi = await stripe.paymentIntents.create({
        amount, currency: 'usd', customer: customerId, setup_future_usage: 'off_session',
        automatic_payment_methods: { enabled: true }, metadata: meta,
      });
      return json({ status: 'requires_action', clientSecret: pi.client_secret, pk: PK, upsell_id: cfg.grant });
    }

    // charge the saved card off-session
    const pi = await stripe.paymentIntents.create({
      amount, currency: 'usd', customer: customerId, payment_method: pm,
      off_session: true, confirm: true, metadata: meta,
    });

    if (pi.status === 'succeeded') {
      await svc.from('payments').upsert({
        id: pi.id, user_id: user.id, amount: amount / 100, currency: 'usd',
        kind: 'upsell:' + cfg.grant, status: 'succeeded', raw: pi as unknown as Record<string, unknown>,
      }, { onConflict: 'id', ignoreDuplicates: true });
      return json({ status: 'accepted', upsell_id: cfg.grant });
    }
    if (pi.status === 'requires_action')
      return json({ status: 'requires_action', clientSecret: pi.client_secret, pk: PK, upsell_id: cfg.grant });
    return json({ status: 'failed' });
  } catch (e) {
    const err = e as Stripe.errors.StripeError & { payment_intent?: Stripe.PaymentIntent };
    if (err?.payment_intent?.client_secret)
      return json({ status: 'requires_action', clientSecret: err.payment_intent.client_secret, pk: PK });
    return json({ status: 'failed', error: String(err?.message || err) }, 200);
  }
});
