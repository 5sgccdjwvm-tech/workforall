import { isAuthorizedCron } from '../../../../lib/pos/webhook.mjs';
import { createLightspeedConnector } from '../../../../lib/pos/lightspeed.mjs';
import { runSync } from '../../../../lib/pos/syncEngine.mjs';
import { createPrismaStore } from '../../../../lib/pos/prismaStore.mjs';

export const runtime = 'nodejs';
const store = createPrismaStore();

export async function GET(req: Request) {
  if (!isAuthorizedCron(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const baseUrl = process.env.LIGHTSPEED_API_BASE_URL;
  const token = process.env.LIGHTSPEED_ACCESS_TOKEN;
  if (!baseUrl || !token) return Response.json({ status: 'BLOCKED', reason: 'Compte Lightspeed non connecté' }, { status: 503 });
  const connector = createLightspeedConnector({ baseUrl, accessToken: token, variant: process.env.LIGHTSPEED_VARIANT || 'x-series' });
  const log = await runSync({ connectionId: 'cernier-centre', connector, store });
  return Response.json(log);
}
