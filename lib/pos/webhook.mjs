// Validation HMAC-SHA256 des webhooks + déduplication. Env : LIGHTSPEED_WEBHOOK_SECRET
import crypto from 'node:crypto';

export function verifySignature(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature).replace(/^sha256=/, ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function handleWebhook({ rawBody, signature, secret, store }) {
  if (!verifySignature(rawBody, signature, secret)) return { status: 401, body: { error: 'Signature invalide' } };
  let evt;
  try { evt = JSON.parse(rawBody); } catch { return { status: 400, body: { error: 'JSON invalide' } }; }
  const id = String(evt.id ?? evt.event_id ?? crypto.createHash('sha256').update(rawBody).digest('hex'));
  const fresh = await store.registerWebhookEvent(id);
  return { status: 200, body: { received: true, duplicate: !fresh, eventId: id } };
}

export function isAuthorizedCron(authHeader, secret) {
  if (!secret) return false;
  const a = Buffer.from(String(authHeader || ''));
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
