export class PostgresRefreshTokenRepository {
  constructor(pool) { this._pool = pool; }

  async create({ userId, tokenHash, expiresAt }) {
    const { rows: [row] } = await this._pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3) RETURNING id`,
      [userId, tokenHash, expiresAt]
    );
    return row;
  }

  async findValidByHash(hash) {
    const { rows } = await this._pool.query(
      `SELECT id, user_id, expires_at, revoked
       FROM refresh_tokens
       WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()
       LIMIT 1`,
      [hash]
    );
    return rows[0] ?? null;
  }

  async revoke(id) {
    await this._pool.query(
      'UPDATE refresh_tokens SET revoked = true WHERE id = $1',
      [id]
    );
  }

  async revokeAllForUser(userId) {
    await this._pool.query(
      'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
      [userId]
    );
  }
}
