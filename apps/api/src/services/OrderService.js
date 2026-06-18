/**
 * OrderService — wraps BillingService + persists the bill snapshot.
 *
 * Checkout = quote + atomic persist (order + lines + coupon usage increment).
 */

import { sum } from '@grocery/domain';

export class OrderService {
  constructor(billingService, orderRepo, couponRepo, notificationService = null) {
    this._billing       = billingService;
    this._orders        = orderRepo;
    this._coupons       = couponRepo;
    this._notifications = notificationService;
  }

  /**
   * Checkout: compute bill then persist it.
   * @param {{ lines: { itemId: string, quantity: number }[], couponCode?: string, userId?: string }} cartDTO
   * @returns {Promise<{ orderId: string, bill: import('@grocery/domain').Bill }>}
   */
  async checkout(cartDTO) {
    const { userId, phone, addressId, deliveryAddress, ...billingDTO } = cartDTO;
    const { bill, couponRecord } = await this._billing.quote(billingDTO, { allowEmptyCart: false });

    const totalDiscount = sum(bill.discounts.map((d) => d.amountPaise));

    // Persist order + lines atomically
    const { id: orderId } = await this._orders.createWithLines({
      order: {
        subtotal: bill.subtotal,
        totalDiscount,
        taxableAmount: bill.taxableAmount,
        totalTax: bill.totalTax,
        grandTotal: bill.grandTotal,
        discounts: bill.discounts,
        skippedOffers: bill.skippedOffers,
        taxBreakdown: bill.taxBreakdown,
        couponId: couponRecord?.id ?? null,
        currency: bill.meta.currency,
        computedAt: bill.meta.computedAt,
        userId: userId ?? null,
        deliveryAddress: deliveryAddress ?? null,
        phone: phone ?? null,
      },
      lines: bill.lineItems.map((li) => ({
        itemId: li.itemId,
        name: li.name,
        unitPrice: li.unitPrice,
        unitType: li.unitType,
        quantity: li.quantity,
        lineSubtotal: li.lineSubtotal,
        gstRateBps: li.gstRateBps,
      })),
    });

    // Atomically increment coupon usage after successful order creation
    if (couponRecord) {
      await this._coupons.incrementUsage(couponRecord.id);
    }

    // Fire-and-forget — never break checkout
    if (this._notifications && phone) {
      this._notifications.sendOrderConfirmation({ phone, orderId, total: bill.grandTotal }).catch(() => {});
    }

    return { orderId, bill };
  }

  /**
   * Fetch a persisted order by ID.
   * @param {string} id
   */
  async getOrder(id) {
    return this._orders.findById(id);
  }

  /**
   * List recent orders (admin).
   * @param {{ limit?: number, offset?: number }} opts
   */
  async listOrders(opts = {}) {
    return this._orders.findAll(opts);
  }

  /**
   * List orders for a specific customer.
   * @param {string} userId
   * @param {{ limit?: number, offset?: number }} opts
   */
  async getMyOrders(userId, opts = {}) {
    return this._orders.findByUserId(userId, opts);
  }
}
