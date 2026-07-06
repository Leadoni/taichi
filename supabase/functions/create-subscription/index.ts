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

// Resolve (create if needed) the auth user id for an email. Mirrors complete-order.
async function resolveUser(db: ReturnType<typeof createClient>, email: string): Promise<string> {
  const created = await db.auth.admin.createUser({ email, email_confirm: true });
  if (created.data?.user) return created.data.user.id;
  const { data: u } = await db.from('users').select('id').eq('email', email).maybeSingle();
  if (u?.id) return u.id;
  const { data: list } = await db.auth.admin.listUsers();
  const found = list?.users?.find((x) => (x.email || '').toLowerCase() === email.toLowerCase());
  if (found) return found.id;
  throw new Error('could not resolve user');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { email: bodyEmail, plan_id, quiz_session_id } = await req.json();
    const plan = PLANS[plan_id];
    if (!plan) return json({ error: 'unknown plan' }, 400);
    if (!quiz_session_id) return json({ error: 'missing quiz_session_id' }, 400);

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

    // Gate: must reference a real quiz-session lead. Email is taken from the server-side
    // quiz row when present (not trusted from the body), which prevents targeting arbitrary accounts.
    const { data: quiz } = await db.from('quiz_sessions').select('id,email').eq('id', quiz_session_id).maybeSingle();
    if (!quiz) return json({ error: 'unknown quiz session' }, 400);
    const clean = (quiz.email || bodyEmail || '').trim().toLowerCase();
    if (!clean) return json({ error: 'missing email' }, 400);

    const userId = await resolveUser(db, clean);

    // Never start a fresh checkout for an account that already has access.
    const { data: urow } = await db.from('users')
      .select('stripe_customer_id,email,subscription_status').eq('id', userId).maybeSingle();
    if (urow?.subscription_status === 'active' || urow?.subscription_status === 'trialing')
      return json({ error: 'already subscribed' }, 409);

    // Reuse an existing customer; only create + link if absent (no overwrite of existing billing link).
    let customerId = urow?.stripe_customer_id as string | null;
    if (!customerId) {
      const c = await stripe.customers.create({ email: clean, metadata: { user_id: userId } });
      customerId = c.id;
    }
    const updates: Record<string, unknown> = { linked_quiz_session_id: quiz_session_id };
    if (!urow?.stripe_customer_id) updates.stripe_customer_id = customerId;
    if (!urow?.email) updates.email = clean;                 // don't overwrite an existing user's email
    await db.from('users').update(updates).eq('id', userId); // service role -> past billing guard
    await db.from('quiz_sessions').update({ user_id: userId, selected_plan: plan_id }).eq('id', quiz_session_id);

    const checkoutToken = crypto.randomUUID();
    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.price }],
      discounts: [{ coupon: plan.coupon }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { user_id: userId, plan_id, checkout_token: checkoutToken },
    });
    const pi = (sub.latest_invoice as Stripe.Invoice).payment_intent as Stripe.PaymentIntent;
    return json({ clientSecret: pi.client_secret, subscriptionId: sub.id, checkoutToken });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
