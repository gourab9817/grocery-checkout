import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';

const BCRYPT_ROUNDS = 10;
const REFRESH_TOKEN_TTL_DAYS = 30;

function jwtSecret() {
  return process.env.RESOLVED_JWT_SECRET || process.env.JWT_SECRET || '';
}

function sha256(str) {
  return createHash('sha256').update(str).digest('hex');
}

export class UserService {
  constructor(pool, refreshTokenRepo) {
    this._pool         = pool;
    this._refreshRepo  = refreshTokenRepo ?? null;
  }

  async signup({ email, password, name }) {
    const { rows: existing } = await this._pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.length > 0) {
      const err = new Error('An account with this email already exists.');
      err.status = 409;
      throw err;
    }
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows: [user] } = await this._pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email.toLowerCase(), hash, name ?? null]
    );
    return this._issueTokens(user);
  }

  async login({ email, password }) {
    const { rows } = await this._pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      throw err;
    }
    return this._issueTokens(user);
  }

  async refresh(rawRefreshToken) {
    if (!this._refreshRepo) throw Object.assign(new Error('Refresh not supported'), { status: 501 });

    const hash = sha256(rawRefreshToken);
    const stored = await this._refreshRepo.findValidByHash(hash);
    if (!stored) {
      const err = new Error('Refresh token invalid or expired.');
      err.status = 401;
      throw err;
    }

    const { rows } = await this._pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [stored.user_id]
    );
    const user = rows[0];
    if (!user) {
      const err = new Error('User not found.');
      err.status = 401;
      throw err;
    }

    // Rotate: revoke old, issue new
    await this._refreshRepo.revoke(stored.id);
    return this._issueTokens(user);
  }

  async logout(rawRefreshToken) {
    if (!this._refreshRepo || !rawRefreshToken) return;
    const hash = sha256(rawRefreshToken);
    const stored = await this._refreshRepo.findValidByHash(hash);
    if (stored) {
      await this._refreshRepo.revoke(stored.id);
    }
  }

  async getById(id) {
    const { rows } = await this._pool.query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  }

  async _issueTokens(user) {
    const secret = jwtSecret();
    if (!secret) throw new Error('JWT_SECRET not configured.');

    const accessToken = jwt.sign(
      { userId: user.id, role: 'customer' },
      secret,
      { expiresIn: '15m' }
    );

    let refreshToken = null;
    if (this._refreshRepo) {
      const raw = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400 * 1000);
      await this._refreshRepo.create({
        userId: user.id,
        tokenHash: sha256(raw),
        expiresAt,
      });
      refreshToken = raw;
    }

    return {
      accessToken,
      refreshToken,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: 'customer',
    };
  }
}
