import pg from 'pg';
import { env } from './env.js';
import { getSecret } from './secrets.js';

const { Pool } = pg;

let _pool = null;

export async function getPool() {
  if (_pool) return _pool;

  let password = env.DB_PASSWORD;
  if (env.DB_SECRET_NAME) {
    const secret = await getSecret(env.DB_SECRET_NAME);
    password = secret.password;
  }

  // Resolved JWT secret stored on process.env so AuthService can read it
  if (env.JWT_SECRET_NAME && !process.env.RESOLVED_JWT_SECRET) {
    const secret = await getSecret(env.JWT_SECRET_NAME);
    process.env.RESOLVED_JWT_SECRET = secret.secret;
  }

  _pool = new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    // AWS RDS requires TLS. Set DB_SSL=true in production.
    // rejectUnauthorized:false accepts RDS's CA without bundling the cert;
    // for strict verification, mount the RDS CA bundle and set it here.
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  return _pool;
}
