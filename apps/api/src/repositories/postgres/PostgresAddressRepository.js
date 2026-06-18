function toAddress(row) {
  return {
    id:        row.id,
    userId:    row.user_id,
    label:     row.label,
    line1:     row.line1,
    line2:     row.line2,
    city:      row.city,
    state:     row.state,
    pincode:   row.pincode,
    phone:     row.phone,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

export class PostgresAddressRepository {
  constructor(pool) { this._pool = pool; }

  async findByUserId(userId) {
    const { rows } = await this._pool.query(
      `SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC`,
      [userId]
    );
    return rows.map(toAddress);
  }

  async findById(id) {
    const { rows } = await this._pool.query(
      `SELECT * FROM addresses WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ? toAddress(rows[0]) : null;
  }

  async create({ userId, label, line1, line2, city, state, pincode, phone, isDefault }) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      if (isDefault) {
        await client.query(
          'UPDATE addresses SET is_default = false WHERE user_id = $1',
          [userId]
        );
      }
      const { rows: [row] } = await client.query(
        `INSERT INTO addresses (user_id, label, line1, line2, city, state, pincode, phone, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [userId, label ?? null, line1, line2 ?? null, city, state, pincode, phone, isDefault ?? false]
      );
      await client.query('COMMIT');
      return toAddress(row);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async update(id, userId, data) {
    const fields = [];
    const values = [];
    let i = 1;
    if (data.label     !== undefined) { fields.push(`label = $${i++}`);     values.push(data.label); }
    if (data.line1     !== undefined) { fields.push(`line1 = $${i++}`);     values.push(data.line1); }
    if (data.line2     !== undefined) { fields.push(`line2 = $${i++}`);     values.push(data.line2); }
    if (data.city      !== undefined) { fields.push(`city = $${i++}`);      values.push(data.city); }
    if (data.state     !== undefined) { fields.push(`state = $${i++}`);     values.push(data.state); }
    if (data.pincode   !== undefined) { fields.push(`pincode = $${i++}`);   values.push(data.pincode); }
    if (data.phone     !== undefined) { fields.push(`phone = $${i++}`);     values.push(data.phone); }
    if (data.isDefault !== undefined) { fields.push(`is_default = $${i++}`); values.push(data.isDefault); }
    if (!fields.length) return this.findById(id);

    values.push(id, userId);
    const { rows } = await this._pool.query(
      `UPDATE addresses SET ${fields.join(', ')} WHERE id = $${i} AND user_id = $${i+1} RETURNING *`,
      values
    );
    return rows[0] ? toAddress(rows[0]) : null;
  }

  async delete(id, userId) {
    const { rowCount } = await this._pool.query(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rowCount > 0;
  }
}
