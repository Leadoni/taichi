// Meta Conversions API sender for server-side Purchase events.
// Fire-and-log: this module must never throw into the payment path.

export interface PurchaseInput {
  eventId: string;
  emailHash?: string | null;      // already normalized + hashed
  value: number;
  currency: string;
  fbc?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  eventSourceUrl?: string | null;
  eventTime?: number;             // unix seconds
}

// Hex SHA-256 of a string (used for email hashing).
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Build the _fbc value from an ad-click id. Null when fbclid is absent.
export function buildFbc(
  fbclid?: string | null,
  clickTimeSec?: number | string | null,
): string | null {
  if (!fbclid) return null;
  const n = typeof clickTimeSec === 'string' ? Number(clickTimeSec) : clickTimeSec;
  const t = (typeof n === 'number' && Number.isFinite(n)) ? Math.floor(n) : Math.floor(Date.now() / 1000);
  return `fb.1.${t}.${fbclid}`;
}

// Pure builder for the Graph API request body. No env, no I/O — fully testable.
export function buildPurchasePayload(
  input: PurchaseInput,
  testEventCode?: string | null,
): Record<string, unknown> {
  const user_data: Record<string, unknown> = {};
  if (input.emailHash) user_data.em = [input.emailHash];
  if (input.clientIp) user_data.client_ip_address = input.clientIp;
  if (input.clientUserAgent) user_data.client_user_agent = input.clientUserAgent;
  if (input.fbc) user_data.fbc = input.fbc;
  const event = {
    event_name: 'Purchase',
    event_id: input.eventId,
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: input.eventSourceUrl || 'https://taimotion.com/',
    user_data,
    custom_data: { value: input.value, currency: input.currency },
  };
  const body: Record<string, unknown> = { data: [event] };
  if (testEventCode) body.test_event_code = testEventCode;
  return body;
}

// Send a Purchase to Meta. Reads env for credentials; no-ops when unconfigured.
export async function sendPurchase(
  args: {
    eventId: string; email?: string | null; value: number; currency: string;
    fbc?: string | null; clientIp?: string | null; clientUserAgent?: string | null;
    eventSourceUrl?: string | null; eventTime?: number;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  try {
    const pixelId = Deno.env.get('META_PIXEL_ID');
    const token = Deno.env.get('META_CAPI_TOKEN');
    if (!pixelId || !token) {
      console.log('[capi] skipped: META_PIXEL_ID/META_CAPI_TOKEN not set');
      return;
    }
    const ver = Deno.env.get('META_API_VERSION') || 'v21.0';
    const testCode = Deno.env.get('META_TEST_EVENT_CODE') || null;
    const emailHash = args.email ? await sha256Hex(args.email.trim().toLowerCase()) : null;
    const { email: _email, ...rest } = args;
    const body = buildPurchasePayload({ ...rest, emailHash }, testCode);
    const url = `https://graph.facebook.com/${ver}/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
    const r = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const txt = await r.text();
    if (!r.ok) console.log(`[capi] non-2xx ${r.status} for ${args.eventId}: ${txt}`);
    else console.log(`[capi] sent ${args.eventId}: ${txt}`);
  } catch (e) {
    console.log(`[capi] error for ${args.eventId}: ${String((e as Error)?.message || e)}`);
  }
}
