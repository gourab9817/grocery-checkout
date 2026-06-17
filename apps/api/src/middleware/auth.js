import jwt from 'jsonwebtoken';
import { DomainError, ERROR_CODES } from '@grocery/domain';

function jwtSecret() {
  return process.env.RESOLVED_JWT_SECRET || process.env.JWT_SECRET || '';
}

export async function requireAdmin(request, _reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Authorization header required.');
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, jwtSecret());
  } catch {
    throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Invalid or expired token.');
  }

  if (payload.role !== 'admin') {
    throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Admin access required.');
  }

  request.user = payload;
}
