import { OrderRepository } from '../interfaces/OrderRepository.js';

export class PostgresOrderRepository extends OrderRepository {
  constructor(pool) { super(); this._pool = pool; }

  async createWithLines({ order, lines }) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [savedOrder] } = await client.query(
        `INSERT INTO orders
           (subtotal, total_discount, taxable_amount, total_tax, grand_total,
            discounts, skipped_offers, tax_breakdown, coupon_id, currency, computed_at, user_id)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12)
         RETURNING id`,
        [
          order.subtotal,
          order.totalDiscount,
          order.taxableAmount,
          order.totalTax,
          order.grandTotal,
          JSON.stringify(order.discounts),
          JSON.stringify(order.skippedOffers),
          JSON.stringify(order.taxBreakdown),
          order.couponId ?? null,
          order.currency ?? 'INR',
          order.computedAt ?? new Date().toISOString(),
          order.userId ?? null,
        ]
      );

      const orderId = savedOrder.id;
      for (const line of lines) {
        await client.query(
          `INSERT INTO order_lines
             (order_id, item_id, item_name, unit_price, unit_type, quantity, line_subtotal, gst_rate_bps)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [orderId, line.itemId, line.name, line.unitPrice, line.unitType, line.quantity, line.lineSubtotal, line.gstRateBps]
        );
      }

      await client.query('COMMIT');
      return { id: orderId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findById(id) {
    const { rows: [order] } = await this._pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );
    if (!order) return null;

    const { rows: lines } = await this._pool.query(
      'SELECT * FROM order_lines WHERE order_id = $1',
      [id]
    );
    return { ...order, lines };
  }

  async findAll({ limit = 50, offset = 0 } = {}) {
    const { rows } = await this._pool.query(
      `SELECT id, grand_total, currency, computed_at, created_at
       FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  }

  async findByUserId(userId, { limit = 50, offset = 0 } = {}) {
    const { rows } = await this._pool.query(
      `SELECT o.id, o.grand_total, o.currency, o.computed_at, o.created_at,
              o.subtotal, o.total_discount, o.grand_total,
              json_agg(json_build_object(
                'itemId', ol.item_id,
                'name', ol.item_name,
                'quantity', ol.quantity,
                'unitType', ol.unit_type,
                'unitPrice', ol.unit_price,
                'lineSubtotal', ol.line_subtotal
              ) ORDER BY ol.id) AS lines
       FROM orders o
       JOIN order_lines ol ON ol.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return rows;
  }
}
