import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const BCRYPT_ROUNDS = 10;

function jwtSecret() {
  return process.env.RESOLVED_JWT_SECRET || process.env.JWT_SECRET || '';
}

export class UserService {
  constructor(pool) {
    this._pool = pool;
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
    return this._sign(user);
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
    return this._sign(user);
  }

  async getById(id) {
    const { rows } = await this._pool.query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  }

  _sign(user) {
    const secret = jwtSecret();
    if (!secret) throw new Error('JWT_SECRET not configured.');
    const token = jwt.sign(
      { userId: user.id, role: 'customer' },
      secret,
      { expiresIn: '30d' }
    );
    return { token, userId: user.id, email: user.email, name: user.name, role: 'customer' };
  }
}
