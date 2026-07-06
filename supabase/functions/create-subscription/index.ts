import Stripe from 'npm:stripe@17';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
// plan_id -> { price (recurring, regular amount), coupon (one-time intro discount) }
const PLANS: Record<string, { price: string; coupon: string }> = {
  '1w':  { price: 'price_1Tq6jrEKxtNHIkyECsS78Flp', coupon: 'pkEtKPXU' },
  '4w':  { price: 'price_1Tq6jsEKxtNHIkyEephY6ycG', coupon: 'BBjhT92G' },
  '12w': { price: 'price_1Tq6jtEKxtNHIkyE2LbKbfuk', coupon: 'vgeoGVPv' },
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return json({ error: 'unauthenticated' }, 401);

    const { plan_id } = await req.json();
    const plan = PLANS[plan_id];
    if (!plan) return json({ error: 'unknown plan' }, 400);

    const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } });
    const { data: row } = await svc.from('users').select('stripe_customer_id,email').eq('id', user.id).maybeSingle();

    let customerId = row?.stripe_customer_id as string | null;
    if (!customerId) {
      const c = await stripe.customers.create({ email: user.email ?? row?.email ?? undefined, metadata: { user_id: user.id } });
      customerId = c.id;
      await svc.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.price }],
      discounts: [{ coupon: plan.coupon }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { user_id: user.id, plan_id },
    });
    const pi = (sub.latest_invoice as Stripe.Invoice).payment_intent as Stripe.PaymentIntent;
    return json({ clientSecret: pi.client_secret, subscriptionId: sub.id });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
