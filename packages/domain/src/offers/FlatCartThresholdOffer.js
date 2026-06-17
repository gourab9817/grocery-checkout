/**
 * FlatCartThresholdOffer — Strategy
 *
 * Applies a flat rupee discount on the cart when the cart total (after
 * category/item discounts) meets or exceeds a minimum threshold.
 *
 * params: { amountPaise: number, minCartTotal: number (paise) }
 *
 * Example: "Flat ₹50 off when cart total ≥ ₹1000"
 *   → { amountPaise: 5000, minCartTotal: 100000 }
 *
 * Per the stacking policy: this rule evaluates against the RUNNING cart total
 * AFTER item/category discounts have been applied. The engine passes the
 * currentCartTotal in the context at the time this rule is evaluated.
 */

import { OfferRule } from './OfferRule.js';
import { format, min } from '../money.js';

export class FlatCartThresholdOffer extends OfferRule {
  constructor(record) {
    super(record);
    this._amountPaise = record.params.amountPaise;
    this._minCartTotal = record.params.minCartTotal;
  }

  /**
   * @param {import('../types.js').CartContext & { currentCartTotal?: number }} ctx
   */
  isEligible(ctx) {
    // currentCartTotal is injected by the engine after prior discounts
    const cartTotal = ctx.currentCartTotal ?? ctx.subtotal;

    if (cartTotal >= this._minCartTotal) {
      return { eligible: true, reason: '' };
    }

    const shortfall = this._minCartTotal - cartTotal;
    return {
      eligible: false,
      reason: `Spend ${format(shortfall)} more to get ${format(this._amountPaise)} off your cart.`,
    };
  }

  /**
   * @param {import('../types.js').CartContext & { currentCartTotal?: number }} ctx
   */
  apply(ctx) {
    const cartTotal = ctx.currentCartTotal ?? ctx.subtotal;
    // Cap discount so it can't exceed the cart value
    const discountAmount = min(this._amountPaise, cartTotal);
    return [this._discount(discountAmount, 'cart')];
  }
}
