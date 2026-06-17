/**
 * BillingService — orchestrates repos + domain to produce a Bill.
 *
 * No HTTP, no SQL here. Receives repos via constructor injection (DIP).
 * Used by both /quote (no persistence) and /checkout (persists via OrderService).
 */

import { computeBill } from '@grocery/domain';
import { DomainError, ERROR_CODES } from '@grocery/domain';

export class BillingService {
  /**
   * @param {import('../repositories/interfaces/CatalogRepository.js').CatalogRepository} catalogRepo
   * @param {import('../repositories/interfaces/OfferRepository.js').OfferRepository} offerRepo
   * @param {import('../repositories/interfaces/CouponRepository.js').CouponRepository} couponRepo
   */
  constructor(catalogRepo, offerRepo, couponRepo) {
    this._catalog = catalogRepo;
    this._offers = offerRepo;
    this._coupons = couponRepo;
  }

  /**
   * Compute a bill without persisting it.
   * @param {{ lines: { itemId: string, quantity: number }[], couponCode?: string }} cartDTO
   * @param {{ allowEmptyCart?: boolean }} opts
   * @returns {Promise<import('@grocery/domain').Bill>}
   */
  async quote(cartDTO, opts = {}) {
    const [catalog, offerRecords] = await Promise.all([
      this._catalog.findAllActive(),
      this._offers.findAllActive(),
    ]);

    // Resolve coupon → append as a coupon offer record
    const allOfferRecords = [...offerRecords];
    let couponRecord = null;

    if (cartDTO.couponCode) {
      couponRecord = await this._resolveCoupon(cartDTO.couponCode);
      allOfferRecords.push({
        id: couponRecord.id,
        name: couponRecord.name,
        type: 'coupon',
        priority: 100,
        exclusive: false,
        active: true,
        params: {
          percentBps: couponRecord.percentBps ?? null,
          amountPaise: couponRecord.amountPaise ?? null,
          maxDiscountPaise: couponRecord.maxDiscountPaise ?? null,
        },
      });
    }

    const bill = computeBill({
      cart: { lines: cartDTO.lines, couponCode: cartDTO.couponCode },
      catalog,
      offerRecords: allOfferRecords,
      computedAt: new Date().toISOString(),
      allowEmptyCart: opts.allowEmptyCart,
    });

    return { bill, couponRecord };
  }

  /**
   * Validate and resolve a coupon code.
   * Throws DomainError if expired, over limit, or not found.
   * @param {string} code
   */
  async _resolveCoupon(code) {
    const coupon = await this._coupons.findByCode(code);
    if (!coupon || !coupon.active) {
      throw new DomainError(ERROR_CODES.COUPON_NOT_FOUND, `Coupon "${code}" not found.`);
    }

    const now = new Date();
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      throw new DomainError(
        ERROR_CODES.COUPON_EXPIRED,
        `Coupon "${code}" expired on ${coupon.validUntil}.`
      );
    }
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      throw new DomainError(
        ERROR_CODES.COUPON_NOT_YET_ACTIVE,
        `Coupon "${code}" is not yet active.`
      );
    }
    if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) {
      throw new DomainError(
        ERROR_CODES.COUPON_LIMIT_REACHED,
        `Coupon "${code}" has reached its usage limit.`
      );
    }

    return coupon;
  }
}
