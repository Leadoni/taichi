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
  '1w':  { price: 'price_1TqChQ3x0B891G8VXfVhEwZ3', coupon: 'fLsSa51J' }, // $5.19 -> $21.99/wk
  '4w':  { price: 'price_1TqChS3x0B891G8VAnNFfhdA', coupon: 'RKIibGD8' }, // $9.99 -> $49.95/4wk
  '12w': { price: 'price_1TqChT3x0B891G8V0FNT81If', coupon: '3sUP0i8K' }, // $19.99 -> $84.95/12wk
};
// TEST onboarding: TMTEST50 subscribes to a $2.00/week price with NO coupon -> $2.00 first AND every renewal.
// (Was $0.50 = Stripe's exact USD minimum, which could net to the customer balance and activate the
// sub with no PaymentIntent/charge. $2.00 is safely above the minimum so a real card charge always happens.)
const TEST_PROMO = 'TMTEST50';
const TEST_PRICE = 'price_1TrZZ53x0B891G8VBXmnt6vP';
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
    const { plan_id, quiz_session_id, promo_code } = await req.json();
    const plan = PLANS[plan_id];
    if (!plan) return json({ error: 'unknown plan' }, 400);
    if (!quiz_session_id) return json({ error: 'missing quiz_session_id' }, 400);

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

    // Gate: must reference a real quiz-session lead. Email is taken from the server-side
    // quiz row when present (not trusted from the body), which prevents targeting arbitrary accounts.
    const { data: quiz } = await db.from('quiz_sessions').select('id,email,name,gender,age_band,height_cm,goal_weight_kg').eq('id', quiz_session_id).maybeSingle();
    if (!quiz) return json({ error: 'unknown quiz session' }, 400);
    // Email must exist server-side on the quiz row; never trust a body-supplied email.
    if (!quiz.email) return json({ error: 'quiz session has no email' }, 400);
    const clean = quiz.email.trim().toLowerCase();

    const userId = await resolveUser(db, clean);

    // Never start a fresh checkout for an account that already has access.
    const { data: urow } = await db.from('users')
      .select('stripe_customer_id,email,subscription_status,name,gender,age_band,height_cm,target_weight_kg').eq('id', userId).maybeSingle();
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
    // Populate profile from the quiz answers (only fill blanks — never clobber edited data).
    if (!urow?.name && quiz.name) updates.name = quiz.name;
    if (!urow?.gender && quiz.gender) updates.gender = quiz.gender;
    if (!urow?.age_band && quiz.age_band) updates.age_band = quiz.age_band;
    if (urow?.height_cm == null && quiz.height_cm != null) updates.height_cm = quiz.height_cm;
    if (urow?.target_weight_kg == null && quiz.goal_weight_kg != null) updates.target_weight_kg = quiz.goal_weight_kg;
    await db.from('users').update(updates).eq('id', userId); // service role -> past billing guard
    await db.from('quiz_sessions').update({ user_id: userId, selected_plan: plan_id }).eq('id', quiz_session_id);

    // Price + discount. Default = plan's regular price + its one-time intro coupon.
    // TEST promo routes to the $0.50/week test price with NO coupon -> $0.50 first and every renewal.
    let priceId = plan.price;
    let discounts: Stripe.SubscriptionCreateParams.Discount[] = [{ coupon: plan.coupon }];
    const isTest = !!promo_code && String(promo_code).trim().toUpperCase() === TEST_PROMO;
    if (isTest) {
      priceId = TEST_PRICE;
      discounts = [];
    } else if (promo_code) {
      const found = await stripe.promotionCodes.list({ code: String(promo_code).trim(), active: true, limit: 1 });
      if (!found.data.length) return json({ error: 'invalid promo code' }, 400);
      const c = found.data[0].coupon as Stripe.Coupon;
      discounts = [{ coupon: c.id }];
    }

    // Guard against duplicate subscriptions: a reload/back of the pay page (or a promo retry)
    // calls this again and would spawn another sub. Cancel any prior UNPAID (incomplete) subs
    // for this customer first, so at most one live checkout exists.
    try {
      const stale = await stripe.subscriptions.list({ customer: customerId, status: 'incomplete', limit: 100 });
      for (const old of stale.data) { try { await stripe.subscriptions.cancel(old.id); } catch (_) { /* ignore */ } }
    } catch (_) { /* best-effort cleanup */ }

    // Root-cause dedup: if the customer already has a LIVE (active/trialing) base subscription, do not
    // create a second one — a page reload or a test-mode re-pay must never double-subscribe/double-bill.
    // The pay page handles this { error: 'already subscribed' } signal by sending the member to the app.
    try {
      const live = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
      if (live.data.some((s) => (s.status === 'active' || s.status === 'trialing') && !s.metadata?.upsell_id)) {
        return json({ error: 'already subscribed' });
      }
    } catch (_) { /* best-effort; fall through to normal creation */ }

    const checkoutToken = crypto.randomUUID();
    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      discounts,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription', payment_method_types: ['card'] },
      expand: ['latest_invoice.payment_intent'],
      metadata: { user_id: userId, plan_id, checkout_token: checkoutToken, test: isTest ? '1' : '' },
    });
    const inv = sub.latest_invoice as Stripe.Invoice;
    const pi = inv.payment_intent as Stripe.PaymentIntent | null;
    // If the first invoice has nothing to collect now (amount_due 0 — e.g. fully covered by an intro
    // discount or the customer's credit balance, or the small test price that netted to balance),
    // Stripe creates NO PaymentIntent and activates the subscription immediately. Reading
    // pi.client_secret here would throw -> 500 -> "Could not start checkout" on the pay page, WHILE the
    // sub is silently active and nothing was charged. Detect that and tell the pay page to skip the
    // card form and go straight through (the member is already provisioned).
    if (!pi || !pi.client_secret) {
      return json({ activated: true, subscriptionId: sub.id, checkoutToken, amount: (inv.amount_due ?? 0) });
    }
    return json({ clientSecret: pi.client_secret, subscriptionId: sub.id, checkoutToken, amount: pi.amount });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
