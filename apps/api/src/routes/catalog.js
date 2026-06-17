import { CatalogController } from '../controllers/catalogController.js';

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ catalogRepo: import('../repositories/interfaces/CatalogRepository.js').CatalogRepository }} opts
 */
export async function catalogRoutes(app, { catalogRepo }) {
  const ctrl = new CatalogController(catalogRepo);

  app.get('/', {
    schema: {
      tags: ['Catalog'],
      summary: 'List active catalog items',
      querystring: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['vegetables', 'fruits', 'dairy', 'staples', 'snacks', 'beverages'],
          },
        },
      },
    },
  }, ctrl.listItems);
}
