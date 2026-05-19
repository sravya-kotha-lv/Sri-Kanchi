const InventoryModel = require('./inventory.model');
const { InventoryService } = require('./inventory.service');
const { createInventoryController } = require('./inventory.controller');
const { createDbAdapter } = require('../common/utils/db-adapter');
const { resolveDb, resolveAdminPreHandler } = require('../common/utils/route-context');
const dbConfig = require('../config/db');

async function inventoryRoutes(fastify) {
  let db;

  try {
    db = resolveDb(fastify);
  } catch (error) {
    db = dbConfig.sequelize || dbConfig;
  }

  db = createDbAdapter(db);
  const model = new InventoryModel(db);
  const service = new InventoryService({ model, db });
  const controller = createInventoryController(service);
  let adminPreHandler = null;

  try {
    adminPreHandler = resolveAdminPreHandler(fastify);
  } catch (error) {
    adminPreHandler = null;
  }

  fastify.route({
    method: 'GET',
    url: '/api/v1/admin/inventory',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.listAdminInventory,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/admin/inventory/low-stock',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.listAdminLowStockInventory,
  });

  fastify.route({
    method: 'POST',
    url: '/api/v1/admin/inventory/adjust',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.adjustAdminInventory,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/admin/inventory/:productId',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.getAdminInventoryByProductId,
  });

  fastify.route({
    method: 'PATCH',
    url: '/api/v1/admin/inventory/:productId',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.patchAdminInventoryByProductId,
  });
}

module.exports = inventoryRoutes;
