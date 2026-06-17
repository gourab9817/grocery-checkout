/**
 * Typed, validated runtime config. Reads process.env once at boot;
 * fails fast with a clear message if a required variable is missing.
 *
 * This is the only file in the codebase that reads process.env directly.
 * Everything else imports from here.
 */

const missing = [];

function required(name) {
  const val = process.env[name];
  if (!val) missing.push(name);
  return val ?? '';
}

function optional(name, defaultValue) {
  return process.env[name] ?? defaultValue;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '3000'), 10),
  HOST: optional('HOST', '0.0.0.0'),

  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
  SUPABASE_ANON_KEY: required('SUPABASE_ANON_KEY'),

  LOG_LEVEL: optional('LOG_LEVEL', 'info'),
};

export function assertEnv() {
  if (missing.length > 0) {
    process.stderr.write(
      `\n[config] Missing required environment variables:\n  ${missing.join('\n  ')}\n` +
        `\nCopy .env.example to .env and fill in the values.\n\n`
    );
    process.exit(1);
  }
}
