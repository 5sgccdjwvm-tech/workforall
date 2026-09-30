// Chiffrement AES-256-GCM des jetons caisse. Clé : POS_ENCRYPTION_KEY (32 octets, base64 ou hex).
import crypto from 'node:crypto';

function getKey(raw = process.env.POS_ENCRYPTION_KEY) {
  if (!raw) throw new Error('POS_ENCRYPTION_KEY manquante');
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('POS_ENCRYPTION_KEY doit faire 32 octets');
  return key;
}

export function encryptSecret(plain, rawKey) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', getKey(rawKey), iv);
  const enc = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
}

export function decryptSecret(payload, rawKey) {
  const [v, iv, tag, data] = String(payload).split(':');
  if (v !== 'v1') throw new Error('Format de secret inconnu');
  const d = crypto.createDecipheriv('aes-256-gcm', getKey(rawKey), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
}
