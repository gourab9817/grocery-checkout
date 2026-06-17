/**
 * BillingController — handles /quote and /checkout.
 */

import { validate } from '../middleware/validate.js';
import { QuoteRequestSchema, CheckoutRequestSchema } from '../schemas/cartSchema.js';
import { format } from '@grocery/domain';

export class BillingController {
  /**
   * @param {import('../services/BillingService.js').BillingService} billingService
   * @param {import('../services/OrderService.js').OrderService} orderService
   */
  constructor(billingService, orderService) {
    this._billing = billingService;
    this._orders = orderService;
  }

  quote = async (request, reply) => {
    const dto = validate(QuoteRequestSchema, request.body);
    const { bill } = await this._billing.quote(dto, { allowEmptyCart: true });
    reply.send({ data: formatBill(bill) });
  };

  checkout = async (request, reply) => {
    const dto = validate(CheckoutRequestSchema, request.body);
    const { orderId, bill } = await this._orders.checkout(dto);
    reply.status(201).send({ data: { orderId, bill: formatBill(bill) } });
  };

  getOrder = async (request, reply) => {
    const order = await this._orders.getOrder(request.params.id);
    if (!order) {
      reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Order not found', requestId: request.id },
      });
      return;
    }
    reply.send({ data: order });
  };
}

/**
 * Add display-formatted amounts to the bill for the frontend.
 * The raw paise values are preserved for precision; formatted strings are added
 * alongside for convenience. Formatting is display-only — never fed back into math.
 */
function formatBill(bill) {
  return {
    ...bill,
    subtotalFormatted: format(bill.subtotal),
    taxableAmountFormatted: format(bill.taxableAmount),
    totalTaxFormatted: format(bill.totalTax),
    grandTotalFormatted: format(bill.grandTotal),
    lineItems: bill.lineItems.map((li) => ({
      ...li,
      unitPriceFormatted: format(li.unitPrice),
      lineSubtotalFormatted: format(li.lineSubtotal),
    })),
    discounts: bill.discounts.map((d) => ({
      ...d,
      amountSavedFormatted: format(d.amountPaise),
    })),
    taxBreakdown: bill.taxBreakdown.map((r) => ({
      ...r,
      ratePercent: r.rateBps / 100,
      taxableBaseFormatted: format(r.taxableBase),
      taxAmountFormatted: format(r.taxAmount),
    })),
  };
}
