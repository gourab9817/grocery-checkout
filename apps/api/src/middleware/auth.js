import jwt from 'jsonwebtoken';
import { DomainError, ERROR_CODES } from '@grocery/domain';

function jwtSecret() {
  return process.env.RESOLVED_JWT_SECRET || process.env.JWT_SECRET || '';
}

function verifyToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Authorization header required.');
  }
  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, jwtSecret());
  } catch {
    throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Invalid or expired token.');
  }
}

export async function requireAdmin(request, _reply) {
  const payload = verifyToken(request.headers.authorization);
  if (payload.role !== 'admin') {
    throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Admin access required.');
  }
  request.user = payload;
}

export async function requireAuth(request, _reply) {
  request.user = verifyToken(request.headers.authorization);
}

export async function optionalAuth(request, _reply) {
  try {
    if (request.headers.authorization?.startsWith('Bearer ')) {
      request.user = verifyToken(request.headers.authorization);
    }
  } catch {
    // unauthenticated is fine for optional auth
  }
}
