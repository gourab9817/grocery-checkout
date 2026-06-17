/**
 * Global error handler — the ONE place that builds error response envelopes.
 * Registered with Fastify's setErrorHandler.
 *
 * Envelope shape (per CONTRACT.md):
 *   { error: { code, message, field?, requestId } }
 */

import { DomainError, HTTP_STATUS_FOR, ERROR_CODES } from '@grocery/domain';

/**
 * @param {import('fastify').FastifyError} error
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
export async function globalErrorHandler(error, request, reply) {
  const requestId = request.id;

  // Domain errors — known, expected, mapped to specific status codes
  if (error instanceof DomainError) {
    const status = HTTP_STATUS_FOR[error.code] ?? 400;
    return reply.status(status).send({
      error: {
        code: error.code,
        message: error.message,
        ...(error.field ? { field: error.field } : {}),
        requestId,
      },
    });
  }

  // Zod validation errors (thrown by our boundary-validate helper)
  if (error.name === 'ZodError') {
    const firstIssue = error.issues?.[0];
    return reply.status(400).send({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: firstIssue?.message ?? 'Validation error',
        field: firstIssue?.path?.join('.') ?? undefined,
        requestId,
      },
    });
  }

  // Fastify schema validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: error.message,
        requestId,
      },
    });
  }

  // Unexpected — log and return 500
  request.log.error({ err: error, requestId }, 'Unhandled error');
  reply.status(500).send({
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      requestId,
    },
  });
}
