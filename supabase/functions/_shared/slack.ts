// Slack business alerts — one Incoming Webhook, per-event formatters.
// Fire-and-log: notifySlack swallows ALL errors. A Slack outage must never fail
// a Stripe webhook (Stripe retries non-2xx) or a user-facing route.
// SLACK_WEBHOOK_URL unset ⇒ silent no-op, so everything runs without Slack.

export async function notifySlack(text: string, fetcher: typeof fetch = fetch): Promise<void> {
  const url = Deno.env.get('SLACK_WEBHOOK_URL');
  if (!url) return;
  try {
    await fetcher(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  } catch (_) { /* never block the caller on Slack */ }
}

const usd = (cents: number, currency: string) => `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;

// ── Formatters (pure — no env, no I/O) ──────────────────────────────────────
// Money/churn events come from the Stripe webhook; product events (lead,
// account created) from the app-facing routes. Lead messages are ANONYMOUS —
// never put lead PII in Slack.

export function fmtSubscriptionPaid(kind: 'initial' | 'renewal', email: string, amountCents: number, currency: string, isTest: boolean): string {
  // Text kept identical to the pre-refactor stripe-webhook messages.
  return `:moneybag: *${kind === 'initial' ? 'New subscription' : 'Renewal'}* — ${email} — ${usd(amountCents, currency)}${isTest ? ' _(test)_' : ''}`;
}

export function fmtUpsellPaid(upsellId: string, email: string, amountCents: number, currency: string, isTest: boolean): string {
  return `:heavy_plus_sign: *Upsell:* ${upsellId} — ${email} — ${usd(amountCents, currency)}${isTest ? ' _(test)_' : ''}`;
}

export function fmtCancelScheduled(email: string, planId: string | null | undefined, periodEndSec: number | null | undefined): string {
  const ends = periodEndSec ? ` — ends ${new Date(periodEndSec * 1000).toISOString().slice(0, 10)}` : '';
  return `:x: *Cancel scheduled* — ${email}${planId ? ` — ${planId}` : ''}${ends}`;
}

export function fmtSubscriptionEnded(email: string, planId: string | null | undefined, upsellId?: string | null): string {
  if (upsellId) return `:headstone: *Upsell ended* — ${upsellId} — ${email}`;
  return `:headstone: *Subscription ended* — ${email}${planId ? ` — ${planId}` : ''}`;
}

export function fmtPaymentFailed(email: string, amountDueCents: number, currency: string, attemptCount: number): string {
  return `:warning: *Payment failed* — ${email} — ${usd(amountDueCents, currency)} — attempt ${attemptCount}`;
}

// amountRefunded is the charge's running total, so partial refunds read '$5.00 of $21.99'.
export function fmtRefund(email: string, amountRefundedCents: number, chargeCents: number, currency: string): string {
  const partial = amountRefundedCents < chargeCents ? ` of ${usd(chargeCents, currency)}` : '';
  return `:money_with_wings: *Refund* — ${email} — ${usd(amountRefundedCents, currency)}${partial}`;
}

// Anonymous by design: a lead is not a customer yet; no email/name in Slack.
export function fmtNewLead(funnel: string | null | undefined, abVariant?: string | null): string {
  const parts = [funnel || 'quiz', abVariant ? `variant ${abVariant}` : null].filter(Boolean);
  return `:email: *New lead* — quiz email captured (${parts.join(', ')})`;
}

export function fmtAccountCreated(email: string): string {
  return `:bust_in_silhouette: *Account created* — ${email}`;
}
