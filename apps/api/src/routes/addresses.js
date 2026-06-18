export async function addressRoutes(app, { addressRepo, requireAuth }) {
  if (!addressRepo) return; // not available in test / in-memory mode
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    const addresses = await addressRepo.findByUserId(request.user.userId);
    reply.send({ data: addresses });
  });

  app.post('/', async (request, reply) => {
    const { label, line1, line2, city, state, pincode, phone, isDefault } = request.body ?? {};
    if (!line1 || !city || !state || !pincode || !phone) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'line1, city, state, pincode, phone are required.' } });
    }
    const address = await addressRepo.create({
      userId: request.user.userId,
      label, line1, line2, city, state, pincode, phone,
      isDefault: isDefault ?? false,
    });
    reply.status(201).send({ data: address });
  });

  app.patch('/:id', async (request, reply) => {
    const address = await addressRepo.update(request.params.id, request.user.userId, request.body ?? {});
    if (!address) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Address not found.' } });
    }
    reply.send({ data: address });
  });

  app.delete('/:id', async (request, reply) => {
    const deleted = await addressRepo.delete(request.params.id, request.user.userId);
    if (!deleted) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Address not found.' } });
    }
    reply.send({ data: { ok: true } });
  });
}
