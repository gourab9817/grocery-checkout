import { makeETag } from '../utils/etag.js';

export class CatalogController {
  /** @param {import('../repositories/interfaces/CatalogRepository.js').CatalogRepository} catalogRepo */
  constructor(catalogRepo) {
    this._catalog = catalogRepo;
  }

  listItems = async (request, reply) => {
    const { category } = request.query;
    let items = await this._catalog.findAllActive();
    if (category) {
      items = items.filter((i) => i.category === category);
    }

    const payload = { data: items, count: items.length };
    const etag = makeETag(JSON.stringify(payload));

    if (request.headers['if-none-match'] === etag) {
      return reply.code(304).send();
    }

    // Send the object (not a pre-stringified string) so Fastify's serializer and
    // @fastify/compress handle content-length/encoding correctly.
    reply
      .header('ETag', etag)
      .header('Cache-Control', 'public, max-age=60')
      .send(payload);
  };
}
