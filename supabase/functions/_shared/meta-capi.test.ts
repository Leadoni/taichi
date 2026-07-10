import { assertEquals, assert } from 'jsr:@std/assert@1';
import { sha256Hex, buildFbc, buildPurchasePayload, sendPurchase } from './meta-capi.ts';

Deno.test('sha256Hex matches the known SHA-256("abc") vector', async () => {
  assertEquals(await sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

Deno.test('buildFbc formats fb.1.<t>.<id> and returns null without fbclid', () => {
  assertEquals(buildFbc('AbC123', 1700000000), 'fb.1.1700000000.AbC123');
  assertEquals(buildFbc('AbC123', '1700000000'), 'fb.1.1700000000.AbC123');
  assertEquals(buildFbc(null, 1700000000), null);
  assertEquals(buildFbc('', 1700000000), null);
});

Deno.test('buildPurchasePayload assembles the event and omits empty user_data fields', () => {
  const body = buildPurchasePayload({
    eventId: 'in_123', emailHash: 'HASH', value: 5.19, currency: 'usd',
    fbc: 'fb.1.1700000000.X', clientIp: '1.2.3.4', clientUserAgent: 'UA',
    eventSourceUrl: 'https://taimotion.com/pay.html', eventTime: 1700000001,
  });
  const ev = (body.data as any[])[0];
  assertEquals(ev.event_name, 'Purchase');
  assertEquals(ev.event_id, 'in_123');
  assertEquals(ev.event_time, 1700000001);
  assertEquals(ev.action_source, 'website');
  assertEquals(ev.event_source_url, 'https://taimotion.com/pay.html');
  assertEquals(ev.user_data.em, ['HASH']);
  assertEquals(ev.user_data.client_ip_address, '1.2.3.4');
  assertEquals(ev.user_data.client_user_agent, 'UA');
  assertEquals(ev.user_data.fbc, 'fb.1.1700000000.X');
  assertEquals(ev.custom_data, { value: 5.19, currency: 'usd' });
  assert(!('test_event_code' in body));
});

Deno.test('buildPurchasePayload includes test_event_code when provided and drops empty fields', () => {
  const body = buildPurchasePayload(
    { eventId: 'pi_1', value: 9.99, currency: 'usd' }, 'TEST123');
  const ev = (body.data as any[])[0];
  assertEquals(body.test_event_code, 'TEST123');
  assertEquals(ev.user_data, {});             // no email/ip/ua/fbc supplied
  assertEquals(ev.event_source_url, 'https://taimotion.com/');
});

Deno.test('sendPurchase no-ops (no fetch) when credentials are missing', async () => {
  const prevPixel = Deno.env.get('META_PIXEL_ID');
  const prevToken = Deno.env.get('META_CAPI_TOKEN');
  Deno.env.delete('META_PIXEL_ID');
  Deno.env.delete('META_CAPI_TOKEN');
  try {
    let called = false;
    const fake: typeof fetch = async () => { called = true; return new Response('{}'); };
    await sendPurchase({ eventId: 'in_1', email: 'a@b.com', value: 1, currency: 'usd' }, fake);
    assertEquals(called, false);
  } finally {
    if (prevPixel === undefined) Deno.env.delete('META_PIXEL_ID'); else Deno.env.set('META_PIXEL_ID', prevPixel);
    if (prevToken === undefined) Deno.env.delete('META_CAPI_TOKEN'); else Deno.env.set('META_CAPI_TOKEN', prevToken);
  }
});

Deno.test('sendPurchase posts to the graph endpoint with a hashed email', async () => {
  const prevPixel = Deno.env.get('META_PIXEL_ID');
  const prevToken = Deno.env.get('META_CAPI_TOKEN');
  const prevTestCode = Deno.env.get('META_TEST_EVENT_CODE');
  Deno.env.set('META_PIXEL_ID', '999');
  Deno.env.set('META_CAPI_TOKEN', 'tok');
  Deno.env.delete('META_TEST_EVENT_CODE');
  try {
    let seenUrl = ''; let seenBody: any = null;
    const fake: typeof fetch = async (url, init) => {
      seenUrl = String(url); seenBody = JSON.parse(String((init as RequestInit).body));
      return new Response('{"events_received":1}', { status: 200 });
    };
    await sendPurchase({ eventId: 'in_9', email: 'Test@Example.com', value: 5.19, currency: 'usd' }, fake);
    assert(seenUrl.includes('/v21.0/999/events'));
    assert(seenUrl.includes('access_token=tok'));
    const em = seenBody.data[0].user_data.em[0];
    assertEquals(em, await sha256Hex('test@example.com'));   // normalized + hashed
  } finally {
    if (prevPixel === undefined) Deno.env.delete('META_PIXEL_ID'); else Deno.env.set('META_PIXEL_ID', prevPixel);
    if (prevToken === undefined) Deno.env.delete('META_CAPI_TOKEN'); else Deno.env.set('META_CAPI_TOKEN', prevToken);
    if (prevTestCode === undefined) Deno.env.delete('META_TEST_EVENT_CODE'); else Deno.env.set('META_TEST_EVENT_CODE', prevTestCode);
  }
});

Deno.test('sendPurchase uses META_API_VERSION override in the graph URL', async () => {
  const prevPixel = Deno.env.get('META_PIXEL_ID');
  const prevToken = Deno.env.get('META_CAPI_TOKEN');
  const prevVer = Deno.env.get('META_API_VERSION');
  Deno.env.set('META_PIXEL_ID', '999');
  Deno.env.set('META_CAPI_TOKEN', 'tok');
  Deno.env.set('META_API_VERSION', 'v18.0');
  try {
    let seenUrl = '';
    const fake: typeof fetch = async (url) => {
      seenUrl = String(url);
      return new Response('{"events_received":1}', { status: 200 });
    };
    await sendPurchase({ eventId: 'in_18', email: 'a@b.com', value: 1, currency: 'usd' }, fake);
    assert(seenUrl.includes('/v18.0/'));
  } finally {
    if (prevPixel === undefined) Deno.env.delete('META_PIXEL_ID'); else Deno.env.set('META_PIXEL_ID', prevPixel);
    if (prevToken === undefined) Deno.env.delete('META_CAPI_TOKEN'); else Deno.env.set('META_CAPI_TOKEN', prevToken);
    if (prevVer === undefined) Deno.env.delete('META_API_VERSION'); else Deno.env.set('META_API_VERSION', prevVer);
  }
});
