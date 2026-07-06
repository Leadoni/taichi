// DEPRECATED / NEUTRALIZED (2026-07-06).
// This function previously provisioned `subscription_status='active'` and minted a magic link
// for any client-supplied email WITHOUT payment — an unauthenticated free-access + takeover
// primitive. Provisioning is now handled exclusively by `stripe-webhook` (only after a real
// Stripe payment). This endpoint is intentionally inert.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  return new Response(
    JSON.stringify({ error: 'deprecated: provisioning is handled by stripe-webhook' }),
    { status: 410, headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
