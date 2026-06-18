/**
 * Auth routes — login + first-run admin registration.
 * POST /auth/login    → { token, email, role }
 * POST /auth/register → { token, email, role }  (only when no admins exist)
 */

const AUTH_RATE_LIMIT = { max: 5, timeWindow: '1 minute' };

export async function authRoutes(app, opts) {
  const { authService } = opts;

  app.post('/login', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) => {
    const { email, password } = request.body ?? {};
    if (!email || !password) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'email and password required.' } });
    }
    try {
      const result = await authService.login({ email, password });
      reply.send({ data: result });
    } catch (err) {
      reply.status(err.status ?? 401).send({ error: { code: 'UNAUTHORIZED', message: err.message } });
    }
  });

  app.post('/register', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) => {
    const { email, password } = request.body ?? {};
    if (!email || !password) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'email and password required.' } });
    }
    try {
      const result = await authService.register({ email, password });
      reply.status(201).send({ data: result });
    } catch (err) {
      reply.status(err.status ?? 400).send({ error: { code: 'AUTH_ERROR', message: err.message } });
    }
  });
}
