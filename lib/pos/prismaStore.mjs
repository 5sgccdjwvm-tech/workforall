// Adaptateur Prisma pour le store POS.
// Respecte le même contrat que memoryStore.mjs afin d'être interchangeable
// dans runSync({ connectionId, connector, store }) et
// handleWebhook({ rawBody, signature, secret, store }).
//
// Si un nom de méthode ci-dessous ne correspond pas exactement à celui utilisé
// par memoryStore.mjs / syncEngine.mjs / webhook.mjs, il suffit d'ajuster le nom
// de la méthode exportée ici : la logique métier ne change pas.
//
// Modèles Prisma attendus (prisma/schema.prisma) :
//   POSConnection      { id, provider, variant, accessToken, refreshToken, lastSyncAt, status, ... }
//   Sale               { id, connectionId, externalId, occurredAt, totalAmount, currency, raw, ... }
//   SyncLog            { id, connectionId, startedAt, finishedAt, status, itemsSynced, error, ... }
//   WebhookEvent       { id, connectionId, provider, externalId, signature, payload, processedAt, status, ... }
//   POSProductMapping  { id, connectionId, externalProductId, internalProductId, ... }
//   UnmappedPOSProduct { id, connectionId, externalProductId, label, firstSeenAt, ... }

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;
const prisma = globalForPrisma.__posPrisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__posPrisma = prisma;

export function createPrismaStore({ client = prisma } = {}) {
  return {
    name: 'prisma',

    /** Récupère une connexion POS par son identifiant métier (ex: 'cernier-centre'). */
    async getConnection(connectionId) {
      return client.pOSConnection.findUnique({ where: { id: connectionId } });
    },

    /** Met à jour la date de dernière synchro réussie et le statut de la connexion. */
    async updateConnectionSyncState(connectionId, { lastSyncAt, status } = {}) {
      return client.pOSConnection.update({
        where: { id: connectionId },
        data: {
          ...(lastSyncAt ? { lastSyncAt } : {}),
          ...(status ? { status } : {}),
        },
      });
    },

    /**
     * Enregistre un lot de ventes normalisées (idempotent sur externalId+connectionId).
     * Retourne le nombre de ventes effectivement créées (les doublons sont ignorés).
     */
    async saveSales(connectionId, sales) {
      if (!Array.isArray(sales) || sales.length === 0) return 0;
      let created = 0;
      for (const sale of sales) {
        const result = await client.sale.upsert({
          where: {
            connectionId_externalId: {
              connectionId,
              externalId: String(sale.externalId ?? sale.id),
            },
          },
          update: {
            occurredAt: sale.occurredAt,
            totalAmount: sale.totalAmount,
            currency: sale.currency,
            raw: sale.raw ?? sale,
          },
          create: {
            connectionId,
            externalId: String(sale.externalId ?? sale.id),
            occurredAt: sale.occurredAt,
            totalAmount: sale.totalAmount,
            currency: sale.currency,
            raw: sale.raw ?? sale,
          },
        });
        if (result) created += 1;
      }
      return created;
    },

    /** Démarre un log de synchronisation, retourne son id. */
    async startSyncLog(connectionId) {
      const log = await client.syncLog.create({
        data: { connectionId, startedAt: new Date(), status: 'RUNNING' },
      });
      return log.id;
    },

    /** Termine un log de synchronisation avec le résultat final. */
    async finishSyncLog(logId, { status, itemsSynced, error } = {}) {
      return client.syncLog.update({
        where: { id: logId },
        data: {
          finishedAt: new Date(),
          status: status || (error ? 'ERROR' : 'SUCCESS'),
          itemsSynced: itemsSynced ?? 0,
          error: error ? String(error?.message || error) : null,
        },
      });
    },

    /** Vérifie si un événement webhook a déjà été traité (déduplication). */
    async hasWebhookEvent(externalId) {
      const existing = await client.webhookEvent.findFirst({ where: { externalId } });
      return Boolean(existing);
    },

    /** Enregistre un événement webhook reçu (déduplication + audit). */
    async recordWebhookEvent({ connectionId, provider, externalId, signature, payload, status } = {}) {
      return client.webhookEvent.create({
        data: {
          connectionId: connectionId ?? null,
          provider,
          externalId,
          signature,
          payload,
          status: status || 'RECEIVED',
          processedAt: new Date(),
        },
      });
    },

    /** Enregistre un mapping produit externe -> interne. */
    async saveProductMapping(connectionId, externalProductId, internalProductId) {
      return client.pOSProductMapping.upsert({
        where: { connectionId_externalProductId: { connectionId, externalProductId } },
        update: { internalProductId },
        create: { connectionId, externalProductId, internalProductId },
      });
    },

    /** Enregistre un produit externe non mappé (pour résolution manuelle ultérieure). */
    async recordUnmappedProduct(connectionId, externalProductId, label) {
      return client.unmappedPOSProduct.upsert({
        where: { connectionId_externalProductId: { connectionId, externalProductId } },
        update: { label },
        create: { connectionId, externalProductId, label, firstSeenAt: new Date() },
      });
    },

    /** Ferme la connexion Prisma (utile pour les scripts/tests courts). */
    async disconnect() {
      await client.$disconnect();
    },
  };
}

export { prisma };
