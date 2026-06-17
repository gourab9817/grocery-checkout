/**
 * Cart resolution — turn a raw Cart + catalog into a priced CartContext.
 *
 * This is O(n): one pass to build a catalog index (Map), one pass over lines.
 * No nested catalog scans. No I/O.
 */

import { DomainError, ERROR_CODES } from './errors.js';
import { mulQuantity, sum } from './money.js';
import { validateQuantity, assertNonEmptyCart } from './validation/index.js';

/**
 * Resolve a raw Cart against a catalog array into a CartContext.
 *
 * Rules enforced here (per CONTRACT.md):
 *   - Duplicate itemIds are MERGED (quantities summed) before resolution.
 *   - Unknown itemId → DomainError(UNKNOWN_ITEM).
 *   - Inactive items → DomainError(UNKNOWN_ITEM) (treat as not found).
 *   - Quantity validated per item's unitType.
 *
 * @param {import('./types.js').Cart} cart
 * @param {import('./types.js').CatalogItem[]} catalog  — full active catalog
 * @param {{ allowEmptyCart?: boolean }} [opts]  — set true for /quote (empty cart is ok)
 * @returns {import('./types.js').CartContext}
 */
export function resolveCartContext(cart, catalog, opts = {}) {
  if (!opts.allowEmptyCart) {
    assertNonEmptyCart(cart);
  }

  // O(n) catalog index: id → item
  /** @type {Map<string, import('./types.js').CatalogItem>} */
  const catalogIndex = new Map(catalog.map((item) => [item.id, item]));

  // Merge duplicate lines: itemId → merged quantity
  /** @type {Map<string, number>} */
  const mergedLines = new Map();
  for (const line of cart.lines) {
    mergedLines.set(line.itemId, (mergedLines.get(line.itemId) ?? 0) + line.quantity);
  }

  // Resolve each merged line
  /** @type {import('./types.js').ResolvedLine[]} */
  const resolvedLines = [];

  let lineIndex = 0;
  for (const [itemId, quantity] of mergedLines) {
    const item = catalogIndex.get(itemId);
    if (!item || !item.active) {
      throw new DomainError(
        ERROR_CODES.UNKNOWN_ITEM,
        `Item "${itemId}" does not exist in the catalog or is inactive.`,
        { field: `lines[${lineIndex}].itemId` }
      );
    }

    validateQuantity(item, quantity, `lines[${lineIndex}].quantity`);

    const lineSubtotal = mulQuantity(item.unitPrice, quantity);
    resolvedLines.push({ item, quantity, lineSubtotal });
    lineIndex++;
  }

  // Category subtotals: O(n)
  /** @type {Map<string, number>} */
  const categorySubtotals = new Map();
  for (const line of resolvedLines) {
    const cat = line.item.category;
    categorySubtotals.set(cat, (categorySubtotals.get(cat) ?? 0) + line.lineSubtotal);
  }

  const subtotal = sum(resolvedLines.map((l) => l.lineSubtotal));

  return { lines: resolvedLines, categorySubtotals, subtotal };
}
