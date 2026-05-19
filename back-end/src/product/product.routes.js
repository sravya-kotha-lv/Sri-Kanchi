const ProductModel = require('./product.model');
const { ProductService } = require('./product.service');
const { createProductController } = require('./product.controller');
const { createDbAdapter } = require('../common/utils/db-adapter');
const { resolveDb, resolveAdminPreHandler } = require('../common/utils/route-context');
const dbConfig = require('../config/db');
const InventoryModel = require('../inventory/inventory.model');


async function productRoutes(fastify) {
  let db;

  try {
    db = resolveDb(fastify);
  } catch (error) {
    db = dbConfig.sequelize || dbConfig;
  }

  db = createDbAdapter(db);

  const model = new ProductModel(db);
const inventoryModel = new InventoryModel(db);
const service = new ProductService({ model, inventoryModel, db });

  const controller = createProductController(service);
  let adminPreHandler = null;

  try {
    adminPreHandler = resolveAdminPreHandler(fastify);
  } catch (error) {
    adminPreHandler = null;
  }

  fastify.route({
    method: 'POST',
    url: '/api/v1/admin/products',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.createAdminProduct,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/admin/products',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.listAdminProducts,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/admin/products/search-suggestions',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.getAdminSearchSuggestions,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/admin/products/:id',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.getAdminProductById,
  });

  fastify.route({
    method: 'PATCH',
    url: '/api/v1/admin/products/:id',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.updateAdminProductById,
  });

  fastify.route({
    method: 'DELETE',
    url: '/api/v1/admin/products/:id',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.deleteAdminProductById,
  });

  fastify.route({
    method: 'POST',
    url: '/api/v1/admin/products/:id/images',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.addAdminProductImage,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/admin/products/:id/images',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.listAdminProductImages,
  });

  fastify.route({
    method: 'PATCH',
    url: '/api/v1/admin/products/:id/images/:imageId',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.updateAdminProductImage,
  });

  fastify.route({
    method: 'DELETE',
    url: '/api/v1/admin/products/:id/images/:imageId',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.deleteAdminProductImage,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/products',
    handler: controller.listPublicProducts,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/products/filters',
    handler: controller.getPublicProductFilters,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/products/search-suggestions',
    handler: controller.getPublicSearchSuggestions,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/products/:slug',
    handler: controller.getPublicProductBySlug,
  });
}

module.exports = productRoutes;
