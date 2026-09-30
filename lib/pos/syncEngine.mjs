// Moteur de synchronisation idempotent.
// store : { hasProcessedSale(connId, extId), markSaleProcessed(connId, extId), findProductByMapping(connId, extProdId, sku),
//           decrementStock(productId, qty), addUnmatched(connId, line), getCursor(connId), setCursor(connId, iso), addSyncLog(log) }

export async function runSync({ connectionId, connector, store, now = () => new Date() }) {
  const startedAt = now().toISOString();
  const stats = { salesSeen: 0, salesApplied: 0, salesSkipped: 0, linesApplied: 0, linesUnmatched: 0, errors: [] };
  let status = 'SUCCESS';
  try {
    const since = await store.getCursor(connectionId);
    const sales = await connector.fetchSalesSince(since);
    let maxDate = since;
    for (const sale of sales) {
      stats.salesSeen++;
      if (await store.hasProcessedSale(connectionId, sale.externalId)) { stats.salesSkipped++; continue; }
      try {
        if (!sale.voided) {
          for (const line of sale.lines) {
            const product = await store.findProductByMapping(connectionId, line.externalProductId, line.sku);
            if (!product) { stats.linesUnmatched++; await store.addUnmatched(connectionId, line); continue; }
            await store.decrementStock(product.id, line.quantity);
            stats.linesApplied++;
          }
        }
        await store.markSaleProcessed(connectionId, sale.externalId);
        stats.salesApplied++;
        if (!maxDate || sale.occurredAt > maxDate) maxDate = sale.occurredAt;
      } catch (e) {
        stats.errors.push(`${sale.externalId}: ${e.message}`);
      }
    }
    if (maxDate) await store.setCursor(connectionId, maxDate);
    if (stats.errors.length || stats.linesUnmatched) status = 'PARTIAL';
  } catch (e) {
    status = 'FAILED';
    stats.errors.push(e.message);
  }
  const log = { connectionId, status, startedAt, finishedAt: now().toISOString(), ...stats };
  await store.addSyncLog(log);
  return log;
}
