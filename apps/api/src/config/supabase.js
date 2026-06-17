import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Service-role client — for server-side operations (bypasses RLS when needed,
 * e.g. order insertion). Never exposed to the browser.
 */
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/**
 * Anon client — respects RLS policies. Used for all read queries on public data.
 */
export const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
