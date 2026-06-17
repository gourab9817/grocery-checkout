/**
 * PercentageCategoryOffer — Strategy
 *
 * Applies a percentage discount on all items in a specific category
 * when that category's subtotal meets or exceeds a minimum threshold.
 *
 * params: { category: string, percentBps: number, minCategorySubtotal: number (paise) }
 *
 * Example: "10% off Vegetables & Fruits when their subtotal ≥ ₹300"
 *   → { category: 'vegetables', percentBps: 1000, minCategorySubtotal: 30000 }
 *      (but the offer can target multiple categories by creating multiple rules,
 *       or by treating 'vegetables_fruits' as a virtual category in the engine)
 *
 * Note: fruits & vegetables share the offer in the assignment example.
 * We model this as two separate rules with the same priority and name,
 * OR as a single rule with category='vegetables' and a combined subtotal check.
 * For maximum clarity we support an optional `categories` array in params.
 */

import { OfferRule } from './OfferRule.js';
import { percentage, format } from '../money.js';

export class PercentageCategoryOffer extends OfferRule {
  constructor(record) {
    super(record);
    /** @type {string[]} One or more categories this offer targets */
    this._categories = Array.isArray(record.params.categories)
      ? record.params.categories
      : [record.params.category];
    this._percentBps = record.params.percentBps;
    this._minCategorySubtotal = record.params.minCategorySubtotal;
  }

  /**
   * @param {import('../types.js').CartContext} ctx
   * @returns {{ eligible: boolean, reason: string }}
   */
  isEligible(ctx) {
    const categoryTotal = this._getCategoryTotal(ctx);

    if (categoryTotal >= this._minCategorySubtotal) {
      return { eligible: true, reason: '' };
    }

    const shortfall = this._minCategorySubtotal - categoryTotal;
    return {
      eligible: false,
      reason: `Spend ${format(shortfall)} more in ${this._categories.join(' & ')} to unlock ${this._percentBps / 100}% off.`,
    };
  }

  /**
   * @param {import('../types.js').CartContext} ctx
   * @returns {import('../types.js').Discount[]}
   */
  apply(ctx) {
    const categoryTotal = this._getCategoryTotal(ctx);
    const discountAmount = percentage(categoryTotal, this._percentBps);
    return [this._discount(discountAmount, `category:${this._categories.join(',')}`)];
  }

  _getCategoryTotal(ctx) {
    let total = 0;
    for (const cat of this._categories) {
      total += ctx.categorySubtotals.get(cat) ?? 0;
    }
    return total;
  }
}
