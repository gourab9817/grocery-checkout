import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

const pool = new pg.Pool({
  host:                   process.env.DB_HOST     || 'localhost',
  port:                   parseInt(process.env.DB_PORT || '5432', 10),
  database:               process.env.DB_NAME     || 'ansrmart',
  user:                   process.env.DB_USER     || 'ansrmart',
  password:               process.env.DB_PASSWORD || '',
  connectionTimeoutMillis: 3000,
});

async function waitForDb(retries = 20, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const client = await pool.connect();
      client.release();
      return;
    } catch (err) {
      process.stdout.write(`  waiting for DB (attempt ${i}/${retries}): ${err.message}\n`);
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function migrate() {
  await waitForDb();

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT        PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows: applied } = await client.query('SELECT filename FROM schema_migrations');
    const appliedSet = new Set(applied.map((r) => r.filename));

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        process.stdout.write(`  skip  ${file}\n`);
        continue;
      }
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      process.stdout.write(`  apply ${file}\n`);
      count++;
    }

    process.stdout.write(`Migrations done. ${count} applied.\n`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    process.stderr.write(`Migration failed: ${err.message}\n`);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
