import { OfferRepository } from '../interfaces/OfferRepository.js';

function toRecord(row) {
  return {
    id:        row.id,
    name:      row.name,
    type:      row.type,
    priority:  Number(row.priority),
    exclusive: row.exclusive,
    active:    row.active,
    params:    row.params,
  };
}

export class PostgresOfferRepository extends OfferRepository {
  constructor(pool) { super(); this._pool = pool; }

  async findAllActive() {
    const { rows } = await this._pool.query(
      `SELECT id, name, type, priority, exclusive, active, params
       FROM offers WHERE active = true ORDER BY priority ASC, id ASC`
    );
    return rows.map(toRecord);
  }

  async findAll() {
    const { rows } = await this._pool.query(
      `SELECT id, name, type, priority, exclusive, active, params FROM offers ORDER BY priority ASC`
    );
    return rows.map(toRecord);
  }

  async create(data) {
    const { rows } = await this._pool.query(
      `INSERT INTO offers (name, type, priority, exclusive, active, params)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id, name, type, priority, exclusive, active, params`,
      [data.name, data.type, data.priority ?? 10, data.exclusive ?? false, data.active ?? true, JSON.stringify(data.params ?? {})]
    );
    return toRecord(rows[0]);
  }

  async update(id, data) {
    const fields = [];
    const values = [];
    let i = 1;
    if (data.name      !== undefined) { fields.push(`name = $${i++}`);      values.push(data.name); }
    if (data.type      !== undefined) { fields.push(`type = $${i++}`);      values.push(data.type); }
    if (data.priority  !== undefined) { fields.push(`priority = $${i++}`);  values.push(data.priority); }
    if (data.exclusive !== undefined) { fields.push(`exclusive = $${i++}`); values.push(data.exclusive); }
    if (data.active    !== undefined) { fields.push(`active = $${i++}`);    values.push(data.active); }
    if (data.params    !== undefined) { fields.push(`params = $${i++}::jsonb`); values.push(JSON.stringify(data.params)); }

    values.push(id);
    const { rows } = await this._pool.query(
      `UPDATE offers SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, name, type, priority, exclusive, active, params`,
      values
    );
    return toRecord(rows[0]);
  }
}
