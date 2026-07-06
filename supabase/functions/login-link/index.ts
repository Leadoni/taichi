import Stripe from 'npm:stripe@17';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Locked down: only issues a magic link for a customer who has a PAID, active subscription
// whose checkout_token matches. Email is derived from the Stripe customer, never from the body.
// This closes the previous unauthenticated "magic link for any email" account-takeover primitive.
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const APP_URL = 'https://app.taimotion.com/';
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { subscriptionId, checkoutToken } = await req.json();
    if (!subscriptionId || !checkoutToken) return json({ error: 'missing checkout proof' }, 400);

    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (sub.metadata?.checkout_token !== checkoutToken) return json({ error: 'bad token' }, 403);
    if (sub.status !== 'active' && sub.status !== 'trialing') return json({ error: 'not paid' }, 402);

    const cust = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
    const email = (cust.email || '').trim().toLowerCase();
    if (!email) return json({ error: 'no email on customer' }, 400);

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data, error } = await db.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: APP_URL } });
    if (error) throw error;
    return json({ ok: true, action_link: data?.properties?.action_link ?? null });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
