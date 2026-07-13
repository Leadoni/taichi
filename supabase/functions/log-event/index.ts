// Standalone analytics sink — writes funnel events to the isolated public.funnel_events
// table ONLY. No reads, no other tables, no auth required. Completely separate from the
// checkout / subscription / webhook system.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : null);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const b = await req.json().catch(() => ({}));
    // Accept a single event or a small batch.
    const raw = Array.isArray(b.events) ? b.events : [b];
    const rows = raw.slice(0, 25).map((e: any) => ({
      session_id: clip(e.session_id, 80),
      user_id: (typeof e.user_id === 'string' && /^[0-9a-f-]{36}$/i.test(e.user_id)) ? e.user_id : null,
      event: clip(e.event, 60),
      props: (e.props && typeof e.props === 'object') ? e.props : null,
      path: clip(e.path, 300),
      page: clip(e.page, 60),
      fbclid: clip(e.fbclid, 255),
      utm: (e.utm && typeof e.utm === 'object') ? e.utm : null,
      ua: clip(req.headers.get('user-agent'), 300),
    })).filter((r) => r.event);
    if (!rows.length) return json({ ok: false, error: 'no event' }, 400);
    const { error } = await svc.from('funnel_events').insert(rows);
    if (error) { console.log('[log-event] ' + error.message); return json({ ok: false }, 500); }
    return json({ ok: true, n: rows.length });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
