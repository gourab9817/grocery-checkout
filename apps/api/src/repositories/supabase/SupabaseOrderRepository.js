import { OrderRepository } from '../interfaces/OrderRepository.js';

export class SupabaseOrderRepository extends OrderRepository {
  constructor(client) {
    super();
    this._db = client;
  }

  /**
   * Persist order + lines atomically.
   * Supabase JS doesn't expose explicit transactions, so we insert the order
   * first, then lines in a single batch. If lines fail, the order is orphaned —
   * for production a Postgres function/RPC would wrap both in a transaction.
   * (Noted as a production improvement in the README roadmap.)
   */
  async createWithLines({ order, lines }) {
    const { data: savedOrder, error: orderErr } = await this._db
      .from('orders')
      .insert({
        subtotal: order.subtotal,
        total_discount: order.totalDiscount,
        taxable_amount: order.taxableAmount,
        total_tax: order.totalTax,
        grand_total: order.grandTotal,
        discounts: order.discounts,
        skipped_offers: order.skippedOffers,
        tax_breakdown: order.taxBreakdown,
        coupon_id: order.couponId ?? null,
        currency: order.currency ?? 'INR',
        computed_at: order.computedAt ?? new Date().toISOString(),
      })
      .select('id')
      .single();
    if (orderErr) throw new Error(`OrderRepo.create order: ${orderErr.message}`);

    const orderId = savedOrder.id;
    const lineRows = lines.map((l) => ({
      order_id: orderId,
      item_id: l.itemId,
      item_name: l.name,
      unit_price: l.unitPrice,
      unit_type: l.unitType,
      quantity: l.quantity,
      line_subtotal: l.lineSubtotal,
      gst_rate_bps: l.gstRateBps,
    }));

    const { error: linesErr } = await this._db.from('order_lines').insert(lineRows);
    if (linesErr) throw new Error(`OrderRepo.create lines: ${linesErr.message}`);

    return { id: orderId };
  }

  async findById(id) {
    const { data: order, error: orderErr } = await this._db
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (orderErr) throw new Error(`OrderRepo.findById order: ${orderErr.message}`);
    if (!order) return null;

    // Single query for all lines (no N+1, relies on idx_order_lines_order_id)
    const { data: lines, error: linesErr } = await this._db
      .from('order_lines')
      .select('*')
      .eq('order_id', id);
    if (linesErr) throw new Error(`OrderRepo.findById lines: ${linesErr.message}`);

    return { ...order, lines: lines ?? [] };
  }

  async findAll({ limit = 50, offset = 0 } = {}) {
    const { data, error } = await this._db
      .from('orders')
      .select('id, grand_total, currency, computed_at, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`OrderRepo.findAll: ${error.message}`);
    return data ?? [];
  }
}
