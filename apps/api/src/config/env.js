/**
 * Typed, validated runtime config.
 * The only file in the codebase that reads process.env directly.
 */

function optional(name, defaultValue) {
  return process.env[name] ?? defaultValue;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT:     parseInt(optional('PORT', '3000'), 10),
  HOST:     optional('HOST', '0.0.0.0'),
  LOG_LEVEL: optional('LOG_LEVEL', 'info'),

  // Postgres connection
  DB_HOST:     optional('DB_HOST', 'localhost'),
  DB_PORT:     parseInt(optional('DB_PORT', '5432'), 10),
  DB_NAME:     optional('DB_NAME', 'ansrmart'),
  DB_USER:     optional('DB_USER', 'ansrmart'),
  DB_PASSWORD: optional('DB_PASSWORD', ''),

  // JWT (used by AuthService)
  JWT_SECRET: optional('JWT_SECRET', ''),

  // AWS / Floci — for Secrets Manager
  AWS_ENDPOINT_URL:      optional('AWS_ENDPOINT_URL', ''),
  AWS_DEFAULT_REGION:    optional('AWS_DEFAULT_REGION', 'us-east-1'),
  AWS_ACCESS_KEY_ID:     optional('AWS_ACCESS_KEY_ID', 'test'),
  AWS_SECRET_ACCESS_KEY: optional('AWS_SECRET_ACCESS_KEY', 'test'),

  // Secret names in Secrets Manager (leave blank to use DB_PASSWORD / JWT_SECRET directly)
  DB_SECRET_NAME:  optional('DB_SECRET_NAME', ''),
  JWT_SECRET_NAME: optional('JWT_SECRET_NAME', ''),
};

export function assertEnv() {
  const issues = [];
  if (!env.DB_HOST) issues.push('DB_HOST');
  if (!env.DB_PASSWORD && !env.DB_SECRET_NAME) issues.push('DB_PASSWORD or DB_SECRET_NAME');
  if (!env.JWT_SECRET && !env.JWT_SECRET_NAME) issues.push('JWT_SECRET or JWT_SECRET_NAME');

  if (issues.length > 0) {
    process.stderr.write(
      `\n[config] Missing required environment variables:\n  ${issues.join('\n  ')}\n` +
        `\nCopy .env.example to .env and fill in the values.\n\n`
    );
    process.exit(1);
  }
}
