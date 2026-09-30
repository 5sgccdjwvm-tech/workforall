// Connecteur Lightspeed générique. Aucun identifiant réel dans le code.
// Env : LIGHTSPEED_VARIANT (x-series | r-series | k-series), LIGHTSPEED_API_BASE_URL,
//       LIGHTSPEED_CLIENT_ID, LIGHTSPEED_CLIENT_SECRET, LIGHTSPEED_TOKEN_URL
import { normalizeLightspeedSale } from './normalize.mjs';

const SALES_PATH = { 'x-series': '/api/2.0/sales', 'r-series': '/Sale.json', 'k-series': '/sales' };

export function createLightspeedConnector({ baseUrl, accessToken, variant = 'x-series', fetchImpl = fetch } = {}) {
  if (!baseUrl) throw new Error('LIGHTSPEED_API_BASE_URL manquante');
  if (!accessToken) throw new Error('Jeton Lightspeed manquant');
  const path = SALES_PATH[variant];
  if (!path) throw new Error(`Variante Lightspeed inconnue : ${variant}`);

  async function get(url) {
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
    if (res.status === 401) throw Object.assign(new Error('Jeton Lightspeed expiré ou invalide'), { code: 'AUTH' });
    if (!res.ok) throw new Error(`Lightspeed HTTP ${res.status}`);
    return res.json();
  }

  return {
    name: 'lightspeed',
    variant,
    async fetchSalesSince(sinceIso) {
      const out = [];
      let url = `${baseUrl.replace(/\/$/, '')}${path}?since=${encodeURIComponent(sinceIso || '1970-01-01T00:00:00Z')}`;
      for (let page = 0; url && page < 100; page++) {
        const body = await get(url);
        const items = body.data || body.Sale || body.sales || [];
        out.push(...(Array.isArray(items) ? items : [items]).map(normalizeLightspeedSale));
        url = body.next ? new URL(body.next, baseUrl).toString() : null;
      }
      return out;
    },
  };
}

export async function exchangeOAuthCode({ code, redirectUri, fetchImpl = fetch, env = process.env }) {
  const { LIGHTSPEED_TOKEN_URL, LIGHTSPEED_CLIENT_ID, LIGHTSPEED_CLIENT_SECRET } = env;
  if (!LIGHTSPEED_TOKEN_URL || !LIGHTSPEED_CLIENT_ID || !LIGHTSPEED_CLIENT_SECRET) {
    throw Object.assign(new Error('BLOCKED : configuration OAuth Lightspeed absente'), { code: 'BLOCKED' });
  }
  const res = await fetchImpl(LIGHTSPEED_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: LIGHTSPEED_CLIENT_ID, client_secret: LIGHTSPEED_CLIENT_SECRET }).toString(),
  });
  if (!res.ok) throw new Error(`Échange OAuth refusé (${res.status})`);
  return res.json();
}
