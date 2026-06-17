/**
 * CouponOffer — Strategy (Phase 2)
 *
 * Applies a coupon discount — either a flat amount or a percentage (capped).
 * Coupons always apply LAST (highest priority number per stacking policy).
 *
 * The coupon's validity (expiry, usage limits) is checked at the SERVICE layer
 * before the engine runs. By the time the engine sees a CouponOffer, it is
 * already known to be valid. This keeps the domain pure (no DB I/O).
 *
 * params: {
 *   percentBps?:       number   — percentage discount in bps (e.g. 1000 = 10%)
 *   amountPaise?:      number   — flat amount in paise
 *   maxDiscountPaise?: number   — cap on the discount (for percentage coupons)
 * }
 *
 * Exactly one of percentBps or amountPaise must be set.
 *
 * Example: FIRSTBUY10 → 10% off, capped at ₹100
 *   params: { percentBps: 1000, maxDiscountPaise: 10000 }
 */

import { OfferRule } from './OfferRule.js';
import { percentage, min, clampToZero } from '../money.js';

export class CouponOffer extends OfferRule {
  constructor(record) {
    super(record);
    this._percentBps = record.params.percentBps ?? null;
    this._amountPaise = record.params.amountPaise ?? null;
    this._maxDiscountPaise = record.params.maxDiscountPaise ?? null;
  }

  isEligible(_ctx) {
    // Validity is pre-checked by the service. If we're here, it's eligible.
    return { eligible: true, reason: '' };
  }

  apply(ctx) {
    const cartTotal = ctx.currentCartTotal ?? ctx.subtotal;
    let discountAmount;

    if (this._percentBps !== null) {
      discountAmount = percentage(cartTotal, this._percentBps);
      if (this._maxDiscountPaise !== null) {
        discountAmount = min(discountAmount, this._maxDiscountPaise);
      }
    } else {
      discountAmount = clampToZero(this._amountPaise ?? 0);
    }

    // Never exceed the cart total
    discountAmount = min(discountAmount, cartTotal);
    return [this._discount(discountAmount, 'cart')];
  }
}
