/**
 * Customer auth routes
 * POST /users/signup  → { token, userId, email, name, role }
 * POST /users/login   → { token, userId, email, name, role }
 * GET  /users/me      → { userId, email, name, role }  (requires bearer token)
 */

export async function userRoutes(app, opts) {
  const { userService, authenticate } = opts;

  app.post('/signup', async (request, reply) => {
    const { email, password, name } = request.body ?? {};
    if (!email || !password) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'email and password required.' } });
    }
    if (password.length < 6) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'password must be at least 6 characters.' } });
    }
    try {
      const result = await userService.signup({ email, password, name });
      reply.status(201).send({ data: result });
    } catch (err) {
      reply.status(err.status ?? 400).send({ error: { code: 'AUTH_ERROR', message: err.message } });
    }
  });

  app.post('/login', async (request, reply) => {
    const { email, password } = request.body ?? {};
    if (!email || !password) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'email and password required.' } });
    }
    try {
      const result = await userService.login({ email, password });
      reply.send({ data: result });
    } catch (err) {
      reply.status(err.status ?? 401).send({ error: { code: 'UNAUTHORIZED', message: err.message } });
    }
  });

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    reply.send({
      data: {
        userId: request.user.userId,
        email: request.user.email,
        name: request.user.name,
        role: request.user.role,
      },
    });
  });
}
