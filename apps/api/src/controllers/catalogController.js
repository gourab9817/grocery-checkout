/**
 * CatalogController — thin HTTP layer.
 * parse → validate → service → shape response. No business logic.
 */

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
    reply.send({ data: items, count: items.length });
  };
}
