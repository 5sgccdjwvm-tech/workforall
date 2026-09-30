// Adaptateur Prisma pour le moteur de synchronisation POS.
// Implémente la même interface que lib/pos/memoryStore.mjs, adossée au schéma prisma/schema.prisma réel.
//
// Points d'attention corrigés par rapport à une implémentation naïve calquée sur memoryStore.mjs :
// - Product n'a PAS de champ "stock" mais "currentQty" (Float).
// - POSProductMapping identifie l'article externe via le champ "externalId" (pas "externalProductId"),
//   avec repli sur Product.sku si aucun mapping n'existe.
// - Sale a une contrainte unique composite @@unique([source, externalId]) : la source Lightspeed
//   utilise systématiquement source = 'LIGHTSPEED'.
// - UnmappedPOSProduct a une contrainte unique @@unique([connectionId, externalId]) : on fait un
//   upsert qui incrémente "occurrences" et met à jour "lastSeenAt" à chaque nouvelle occurrence.
// - SyncLog.errors est un Int (compteur), pas un tableau : on stocke stats.errors.length et on
//   sérialise le détail des erreurs dans "message" pour ne rien perdre.

import { PrismaClient } from '@prisma/client';

const SOURCE = 'LIGHTSPEED';

export function createPrismaStore({ prisma = new PrismaClient(), establishmentId } = {}) {
  if (!establishmentId) throw new Error('createPrismaStore: establishmentId est requis');

  return {
    prisma,

    async hasProcessedSale(connectionId, externalId) {
      const sale = await prisma.sale.findUnique({
        where: { source_externalId: { source: SOURCE, externalId: String(externalId) } },
        select: { id: true },
      });
      return !!sale;
    },

    async markSaleProcessed(connectionId, externalId, meta = {}) {
      await prisma.sale.upsert({
        where: { source_externalId: { source: SOURCE, externalId: String(externalId) } },
        update: {},
        create: {
          source: SOURCE,
          externalId: String(externalId),
          total: meta.total ?? 0,
          soldAt: meta.soldAt ?? new Date(),
          establishmentId,
          connectionId,
        },
      });
    },

    async findProductByMapping(connectionId, extId, sku) {
      if (extId != null) {
        const mapping = await prisma.pOSProductMapping.findUnique({
          where: { connectionId_externalId: { connectionId, externalId: String(extId) } },
          include: { product: true },
        });
        if (mapping) return mapping.product;
      }
      if (sku) {
        return prisma.product.findFirst({ where: { sku, establishmentId } });
      }
      return null;
    },

    async decrementStock(productId, qty) {
      const product = await prisma.product.update({
        where: { id: productId },
        data: { currentQty: { decrement: qty } },
      });
      await prisma.stockMovement.create({
        data: {
          type: 'SALE',
          quantity: qty,
          origin: 'LIGHTSPEED',
          productId,
          establishmentId,
        },
      });
      return product;
    },

    async addUnmatched(connectionId, line) {
      const externalId = String(line.externalProductId ?? line.externalId ?? '');
      if (!externalId) return;
      await prisma.unmappedPOSProduct.upsert({
        where: { connectionId_externalId: { connectionId, externalId } },
        update: {
          occurrences: { increment: 1 },
          lastSeenAt: new Date(),
          externalName: line.name ?? line.externalName ?? undefined,
        },
        create: {
          connectionId,
          externalId,
          externalName: line.name ?? line.externalName ?? externalId,
          establishmentId,
        },
      });
    },

    async getCursor(connectionId) {
      const conn = await prisma.pOSConnection.findUnique({
        where: { id: connectionId },
        select: { lastSaleCursor: true },
      });
      return conn?.lastSaleCursor ? conn.lastSaleCursor.toISOString() : null;
    },

    async setCursor(connectionId, iso) {
      await prisma.pOSConnection.update({
        where: { id: connectionId },
        data: { lastSaleCursor: new Date(iso), lastSync: new Date() },
      });
    },

    async addSyncLog(log) {
      await prisma.syncLog.create({
        data: {
          connectionId: log.connectionId,
          status: log.status,
          message: log.errors?.length ? log.errors.join(' | ').slice(0, 2000) : 'OK',
          trigger: log.trigger ?? 'MANUAL',
          salesImported: log.salesApplied ?? 0,
          salesSkipped: log.salesSkipped ?? 0,
          errors: log.errors?.length ?? 0,
          createdAt: log.startedAt ? new Date(log.startedAt) : undefined,
          finishedAt: log.finishedAt ? new Date(log.finishedAt) : new Date(),
        },
      });
      await prisma.pOSConnection.update({
        where: { id: log.connectionId },
        data: { syncCount: { increment: 1 } },
      });
    },

    async registerWebhookEvent(eventId, payload = {}) {
      try {
        await prisma.webhookEvent.create({
          data: {
            eventId: String(eventId),
            type: payload.type ?? 'unknown',
            payload: JSON.stringify(payload).slice(0, 10000),
            connectionId: payload.connectionId ?? null,
          },
        });
        return true;
      } catch (e) {
        // Violation de contrainte unique sur eventId => webhook déjà reçu (déduplication).
        if (e.code === 'P2002') return false;
        throw e;
      }
    },

    // --- Gestion du cycle de vie de la connexion (auth, refresh, déconnexion) ---

    async disconnect(connectionId) {
      await prisma.pOSConnection.update({
        where: { id: connectionId },
        data: {
          status: 'NON_CONNECTE',
          encryptedAccessToken: null,
          encryptedRefreshToken: null,
          tokenExpiresAt: null,
        },
      });
    },

    async saveTokens(connectionId, { encryptedAccessToken, encryptedRefreshToken, tokenExpiresAt }) {
      await prisma.pOSConnection.update({
        where: { id: connectionId },
        data: {
          status: 'CONNECTE',
          encryptedAccessToken,
          encryptedRefreshToken,
          tokenExpiresAt,
        },
      });
    },

    async markError(connectionId) {
      await prisma.pOSConnection.update({
        where: { id: connectionId },
        data: { status: 'ERREUR' },
      });
    },
  };
}
