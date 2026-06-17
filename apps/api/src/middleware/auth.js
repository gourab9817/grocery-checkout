/**
 * Admin auth middleware — verifies a Supabase JWT and checks the admin role.
 * Registered as a preHandler on /admin/* routes.
 *
 * The client sends: Authorization: Bearer <supabase-jwt>
 * The Supabase service-role client verifies and decodes it.
 *
 * supabaseAdmin is lazily imported so the module can be loaded in test files
 * without triggering the RealtimeClient WebSocket constructor (Node < 22).
 */

import { DomainError, ERROR_CODES } from '@grocery/domain';

/**
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} _reply
 */
export async function requireAdmin(request, _reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Authorization header required.');
  }

  const token = authHeader.slice(7);
  const { supabaseAdmin } = await import('../config/supabase.js');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Invalid or expired token.');
  }

  // Check admin role in user_metadata or app_metadata
  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  if (role !== 'admin') {
    throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Admin access required.');
  }

  request.user = user;
}
