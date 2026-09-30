// Store en mémoire (tests et développement). L'adaptateur Prisma implémente la même interface.
export function createMemoryStore({ products = [], mappings = [] } = {}) {
  const s = { products: new Map(products.map((p) => [p.id, { ...p }])), mappings: [...mappings], processed: new Set(), unmatched: [], cursors: new Map(), logs: [], webhookIds: new Set() };
  return {
    state: s,
    async hasProcessedSale(c, id) { return s.processed.has(`${c}:${id}`); },
    async markSaleProcessed(c, id) { s.processed.add(`${c}:${id}`); },
    async findProductByMapping(c, extId, sku) {
      const m = s.mappings.find((m) => m.connectionId === c && m.externalProductId === extId);
      if (m) return s.products.get(m.productId) || null;
      return sku ? [...s.products.values()].find((p) => p.sku === sku) || null : null;
    },
    async decrementStock(id, q) { const p = s.products.get(id); p.stock -= q; },
    async addUnmatched(c, line) { if (!s.unmatched.some((u) => u.connectionId === c && u.externalProductId === line.externalProductId)) s.unmatched.push({ connectionId: c, ...line }); },
    async getCursor(c) { return s.cursors.get(c) || null; },
    async setCursor(c, iso) { s.cursors.set(c, iso); },
    async addSyncLog(l) { s.logs.push(l); },
    async registerWebhookEvent(id) { if (s.webhookIds.has(id)) return false; s.webhookIds.add(id); return true; },
  };
}
