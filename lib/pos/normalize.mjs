// Format commun pour toutes les caisses.
// Vente normalisée : { externalId, occurredAt, lines: [{ externalProductId, sku, name, quantity }] }

export function normalizeLightspeedSale(raw) {
  const lines = (raw.line_items || raw.sale_lines || raw.lines || []).map((l) => ({
    externalProductId: String(l.product_id ?? l.productId ?? l.itemID ?? ''),
    sku: l.sku ?? l.product_sku ?? null,
    name: l.name ?? l.product_name ?? null,
    quantity: Number(l.quantity ?? l.unitQuantity ?? 0),
  }));
  const status = String(raw.status || '').toUpperCase();
  return {
    externalId: String(raw.id ?? raw.saleID),
    occurredAt: new Date(raw.sale_date ?? raw.created_at ?? raw.timeStamp ?? Date.now()).toISOString(),
    voided: status === 'VOIDED' || raw.voided === true,
    lines: lines.filter((l) => l.externalProductId && l.quantity !== 0),
  };
}
