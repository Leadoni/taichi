import { assert, assertEquals } from 'jsr:@std/assert@1';
import {
  fmtAccountCreated, fmtCancelScheduled, fmtNewLead, fmtPaymentFailed, fmtRefund,
  fmtSubscriptionEnded, fmtSubscriptionPaid, fmtUpsellPaid, notifySlack,
} from './slack.ts';

Deno.test('notifySlack no-ops (no fetch) when SLACK_WEBHOOK_URL is unset', async () => {
  const prev = Deno.env.get('SLACK_WEBHOOK_URL');
  Deno.env.delete('SLACK_WEBHOOK_URL');
  try {
    let called = false;
    const fake: typeof fetch = async () => { called = true; return new Response('ok'); };
    await notifySlack('hello', fake);
    assertEquals(called, false);
  } finally {
    if (prev === undefined) Deno.env.delete('SLACK_WEBHOOK_URL'); else Deno.env.set('SLACK_WEBHOOK_URL', prev);
  }
});

Deno.test('notifySlack posts {text} JSON and swallows fetch failures', async () => {
  const prev = Deno.env.get('SLACK_WEBHOOK_URL');
  Deno.env.set('SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/T/B/x');
  try {
    let seenBody: unknown = null;
    const ok: typeof fetch = async (_url, init) => { seenBody = JSON.parse(String((init as RequestInit).body)); return new Response('ok'); };
    await notifySlack('hi there', ok);
    assertEquals(seenBody, { text: 'hi there' });
    const boom: typeof fetch = () => { throw new Error('network down'); };
    await notifySlack('must not throw', boom); // swallowing = not throwing here
  } finally {
    if (prev === undefined) Deno.env.delete('SLACK_WEBHOOK_URL'); else Deno.env.set('SLACK_WEBHOOK_URL', prev);
  }
});

Deno.test('money/churn formatters match the established channel format', () => {
  assertEquals(fmtSubscriptionPaid('initial', 'a@b.com', 519, 'usd', false),
    ':moneybag: *New subscription* — a@b.com — $5.19 USD');
  assertEquals(fmtSubscriptionPaid('renewal', 'a@b.com', 2199, 'usd', true),
    ':moneybag: *Renewal* — a@b.com — $21.99 USD _(test)_');
  assertEquals(fmtUpsellPaid('all_guides', 'a@b.com', 3899, 'usd', false),
    ':heavy_plus_sign: *Upsell:* all_guides — a@b.com — $38.99 USD');
  assertEquals(fmtCancelScheduled('a@b.com', '4w', 1_800_000_000),
    ':x: *Cancel scheduled* — a@b.com — 4w — ends 2027-01-15');
  assertEquals(fmtSubscriptionEnded('a@b.com', '12w'),
    ':headstone: *Subscription ended* — a@b.com — 12w');
  assertEquals(fmtSubscriptionEnded('a@b.com', null, 'all_guides'),
    ':headstone: *Upsell ended* — all_guides — a@b.com');
  assertEquals(fmtPaymentFailed('a@b.com', 4995, 'usd', 2),
    ':warning: *Payment failed* — a@b.com — $49.95 USD — attempt 2');
  assertEquals(fmtAccountCreated('a@b.com'),
    ':bust_in_silhouette: *Account created* — a@b.com');
  assertEquals(fmtRefund('a@b.com', 2199, 2199, 'usd'),
    ':money_with_wings: *Refund* — a@b.com — $21.99 USD'); // full: no "of" clause
  assertEquals(fmtRefund('a@b.com', 500, 2199, 'usd'),
    ':money_with_wings: *Refund* — a@b.com — $5.00 USD of $21.99 USD'); // partial
});

Deno.test('lead formatter is anonymous — no PII ever', () => {
  const msg = fmtNewLead('chair-taichi', 'B');
  assertEquals(msg, ':email: *New lead* — quiz email captured (chair-taichi, variant B)');
  assert(!msg.includes('@'));
  assertEquals(fmtNewLead(null), ':email: *New lead* — quiz email captured (quiz)');
});
