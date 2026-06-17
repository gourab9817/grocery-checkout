import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const BCRYPT_ROUNDS = 12;

function jwtSecret() {
  return process.env.RESOLVED_JWT_SECRET || process.env.JWT_SECRET || '';
}

export class AuthService {
  constructor(pool) {
    this._pool = pool;
  }

  async register({ email, password }) {
    const { rows } = await this._pool.query('SELECT COUNT(*) FROM admin_users');
    if (parseInt(rows[0].count, 10) > 0) {
      const err = new Error('Admin already exists. Use an admin token to create more users.');
      err.status = 403;
      throw err;
    }
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows: [user] } = await this._pool.query(
      'INSERT INTO admin_users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role',
      [email.toLowerCase(), hash]
    );
    return this._sign(user);
  }

  async login({ email, password }) {
    const { rows } = await this._pool.query(
      'SELECT id, email, role, password_hash FROM admin_users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user) {
      const err = new Error('Invalid credentials.');
      err.status = 401;
      throw err;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const err = new Error('Invalid credentials.');
      err.status = 401;
      throw err;
    }
    return this._sign(user);
  }

  _sign(user) {
    const secret = jwtSecret();
    if (!secret) throw new Error('JWT_SECRET not configured.');
    const token = jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn: '8h' });
    return { token, email: user.email, role: user.role };
  }
}
