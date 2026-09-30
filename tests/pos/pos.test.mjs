import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { encryptSecret, decryptSecret } from '../../lib/pos/crypto.mjs';
import { createLightspeedConnector } from '../../lib/pos/lightspeed.mjs';
import { runSync } from '../../lib/pos/syncEngine.mjs';
import { createMemoryStore } from '../../lib/pos/memoryStore.mjs';
import { handleWebhook, isAuthorizedCron } from '../../lib/pos/webhook.mjs';
import { startFakeLightspeed } from './fakeLightspeed.mjs';

const KEY = crypto.randomBytes(32).toString('base64');
const sale = (id, lines, extra = {}) => ({ id, sale_date: `2026-09-${String(10 + Number(id)).padStart(2, '0')}T10:00:00Z`, line_items: lines, ...extra });

test('chiffrement des jetons : aller-retour et altération détectée', () => {
  const enc = encryptSecret('secret-token', KEY);
  assert.notEqual(enc, 'secret-token');
  assert.equal(decryptSecret(enc, KEY), 'secret-token');
  const bad = enc.slice(0, -2) + (enc.endsWith('A') ? 'B' : 'A') + '=';
  assert.throws(() => decryptSecret(bad, KEY));
});

test('synchro : décrément du stock, pagination, idempotence', async () => {
  const fake = await startFakeLightspeed({ pages: [[sale(1, [{ product_id: 'LS1', quantity: 2 }])], [sale(2, [{ product_id: 'LS1', quantity: 1 }, { product_id: 'X', sku: 'SKU-B', quantity: 3 }])]] });
  try {
    const store = createMemoryStore({ products: [{ id: 'a', stock: 10 }, { id: 'b', sku: 'SKU-B', stock: 5 }], mappings: [{ connectionId: 'c1', externalProductId: 'LS1', productId: 'a' }] });
    const connector = createLightspeedConnector({ baseUrl: fake.url, accessToken: 'test-token' });
    const log1 = await runSync({ connectionId: 'c1', connector, store });
    assert.equal(log1.status, 'SUCCESS');
    assert.equal(store.state.products.get('a').stock, 7);
    assert.equal(store.state.products.get('b').stock, 2);
    store.state.cursors.clear(); // rejouer tout : aucun double décrément
    const log2 = await runSync({ connectionId: 'c1', connector, store });
    assert.equal(log2.salesSkipped, 2);
    assert.equal(store.state.products.get('a').stock, 7);
  } finally { await fake.close(); }
});

test('produit inconnu => PARTIAL + « Produits à associer »', async () => {
  const fake = await startFakeLightspeed({ pages: [[sale(3, [{ product_id: 'NOPE', name: 'Bière', quantity: 1 }])]] });
  try {
    const store = createMemoryStore();
    const log = await runSync({ connectionId: 'c1', connector: createLightspeedConnector({ baseUrl: fake.url, accessToken: 'test-token' }), store });
    assert.equal(log.status, 'PARTIAL');
    assert.equal(store.state.unmatched[0].externalProductId, 'NOPE');
  } finally { await fake.close(); }
});

test('vente annulée : pas de décrément', async () => {
  const fake = await startFakeLightspeed({ pages: [[sale(4, [{ product_id: 'LS1', quantity: 2 }], { status: 'VOIDED' })]] });
  try {
    const store = createMemoryStore({ products: [{ id: 'a', stock: 10 }], mappings: [{ connectionId: 'c1', externalProductId: 'LS1', productId: 'a' }] });
    await runSync({ connectionId: 'c1', connector: createLightspeedConnector({ baseUrl: fake.url, accessToken: 'test-token' }), store });
    assert.equal(store.state.products.get('a').stock, 10);
  } finally { await fake.close(); }
});

test('jeton invalide => FAILED journalisé', async () => {
  const fake = await startFakeLightspeed({ pages: [[]] });
  try {
    const store = createMemoryStore();
    const log = await runSync({ connectionId: 'c1', connector: createLightspeedConnector({ baseUrl: fake.url, accessToken: 'mauvais' }), store });
    assert.equal(log.status, 'FAILED');
    assert.equal(store.state.logs.length, 1);
  } finally { await fake.close(); }
});

test('webhook : signature + déduplication', async () => {
  const store = createMemoryStore();
  const body = JSON.stringify({ id: 'evt-1', type: 'sale.update' });
  const sig = crypto.createHmac('sha256', 's3cr3t').update(body).digest('hex');
  assert.equal((await handleWebhook({ rawBody: body, signature: 'faux', secret: 's3cr3t', store })).status, 401);
  const r1 = await handleWebhook({ rawBody: body, signature: sig, secret: 's3cr3t', store });
  const r2 = await handleWebhook({ rawBody: body, signature: sig, secret: 's3cr3t', store });
  assert.equal(r1.body.duplicate, false);
  assert.equal(r2.body.duplicate, true);
});

test('cron protégé', () => {
  assert.equal(isAuthorizedCron('Bearer abc', 'abc'), true);
  assert.equal(isAuthorizedCron('Bearer x', 'abc'), false);
  assert.equal(isAuthorizedCron('Bearer abc', undefined), false);
});
