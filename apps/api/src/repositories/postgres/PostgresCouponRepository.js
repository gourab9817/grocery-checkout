import { CouponRepository } from '../interfaces/CouponRepository.js';

const COLS = 'id, code, name, percent_bps, amount_paise, max_discount_paise, valid_from, valid_until, max_uses, uses_count, active';

function toRecord(row) {
  return {
    id:               row.id,
    code:             row.code,
    name:             row.name,
    percentBps:       row.percent_bps   !== null ? Number(row.percent_bps)   : null,
    amountPaise:      row.amount_paise  !== null ? Number(row.amount_paise)  : null,
    maxDiscountPaise: row.max_discount_paise !== null ? Number(row.max_discount_paise) : null,
    validFrom:        row.valid_from,
    validUntil:       row.valid_until,
    maxUses:          row.max_uses      !== null ? Number(row.max_uses)      : null,
    usesCount:        Number(row.uses_count),
    active:           row.active,
  };
}

export class PostgresCouponRepository extends CouponRepository {
  constructor(pool) { super(); this._pool = pool; }

  async findByCode(code) {
    const { rows } = await this._pool.query(
      `SELECT ${COLS} FROM coupons WHERE UPPER(code) = UPPER($1) AND active = true LIMIT 1`,
      [code]
    );
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async incrementUsage(id) {
    await this._pool.query(
      'UPDATE coupons SET uses_count = uses_count + 1 WHERE id = $1',
      [id]
    );
  }

  async create(data) {
    const { rows } = await this._pool.query(
      `INSERT INTO coupons (code, name, percent_bps, amount_paise, max_discount_paise, valid_from, valid_until, max_uses, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${COLS}`,
      [
        data.code.toUpperCase(),
        data.name,
        data.percentBps      ?? null,
        data.amountPaise     ?? null,
        data.maxDiscountPaise ?? null,
        data.validFrom       ?? new Date().toISOString(),
        data.validUntil      ?? null,
        data.maxUses         ?? null,
        data.active          ?? true,
      ]
    );
    return toRecord(rows[0]);
  }
}
