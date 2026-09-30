import { handleWebhook } from '../../../../lib/pos/webhook.mjs';
import { createMemoryStore } from '../../../../lib/pos/memoryStore.mjs';

export const runtime = 'nodejs';
const store = createMemoryStore(); // TODO: remplacer par l'adaptateur Prisma

export async function POST(req: Request) {
  const secret = process.env.LIGHTSPEED_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: 'BLOCKED : LIGHTSPEED_WEBHOOK_SECRET non configuré' }, { status: 503 });
  const rawBody = await req.text();
  const r = await handleWebhook({ rawBody, signature: req.headers.get('x-signature'), secret, store });
  return Response.json(r.body, { status: r.status });
}
