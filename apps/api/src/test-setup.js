/**
 * API test setup — runs before every test file.
 * Sets minimal env vars so config/env.js doesn't exit on missing vars.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-32chars-minimum';
process.env.DB_HOST     = process.env.DB_HOST     ?? 'localhost';
process.env.DB_PORT     = process.env.DB_PORT     ?? '5432';
process.env.DB_NAME     = process.env.DB_NAME     ?? 'ansrmart_test';
process.env.DB_USER     = process.env.DB_USER     ?? 'ansrmart';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? '';
