import { CatalogRepository } from '../interfaces/CatalogRepository.js';

const COLS = 'id, name, category, unit_type, unit_price, gst_rate_bps, active';

function toItem(row) {
  return {
    id:          row.id,
    name:        row.name,
    category:    row.category,
    unitType:    row.unit_type,
    unitPrice:   Number(row.unit_price),
    gstRateBps:  Number(row.gst_rate_bps),
    active:      row.active,
  };
}

export class PostgresCatalogRepository extends CatalogRepository {
  constructor(pool) { super(); this._pool = pool; }

  async findAllActive() {
    const { rows } = await this._pool.query(
      `SELECT ${COLS} FROM catalog_items WHERE active = true ORDER BY category, name`
    );
    return rows.map(toItem);
  }

  async findByIds(ids) {
    if (ids.length === 0) return [];
    const { rows } = await this._pool.query(
      `SELECT ${COLS} FROM catalog_items WHERE id = ANY($1::uuid[])`,
      [ids]
    );
    return rows.map(toItem);
  }

  async findById(id) {
    const { rows } = await this._pool.query(
      `SELECT ${COLS} FROM catalog_items WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ? toItem(rows[0]) : null;
  }

  async findAll() {
    const { rows } = await this._pool.query(
      `SELECT ${COLS} FROM catalog_items ORDER BY category, name`
    );
    return rows.map(toItem);
  }

  async create(data) {
    const { rows } = await this._pool.query(
      `INSERT INTO catalog_items (name, category, unit_type, unit_price, gst_rate_bps, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLS}`,
      [data.name, data.category, data.unitType, data.unitPrice, data.gstRateBps, data.active ?? true]
    );
    return toItem(rows[0]);
  }

  async update(id, data) {
    const fields = [];
    const values = [];
    let i = 1;
    if (data.name      !== undefined) { fields.push(`name = $${i++}`);          values.push(data.name); }
    if (data.category  !== undefined) { fields.push(`category = $${i++}`);      values.push(data.category); }
    if (data.unitType  !== undefined) { fields.push(`unit_type = $${i++}`);     values.push(data.unitType); }
    if (data.unitPrice !== undefined) { fields.push(`unit_price = $${i++}`);    values.push(data.unitPrice); }
    if (data.gstRateBps !== undefined){ fields.push(`gst_rate_bps = $${i++}`);  values.push(data.gstRateBps); }
    if (data.active    !== undefined) { fields.push(`active = $${i++}`);        values.push(data.active); }

    values.push(id);
    const { rows } = await this._pool.query(
      `UPDATE catalog_items SET ${fields.join(', ')} WHERE id = $${i} RETURNING ${COLS}`,
      values
    );
    return toItem(rows[0]);
  }
}
