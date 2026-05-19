const DiscountModel = require('./discount.model');
const { DiscountService } = require('./discount.service');
const { createDiscountController } = require('./discount.controller');
const { createDbAdapter } = require('../common/utils/db-adapter');
const { resolveDb, resolveAdminPreHandler } = require('../common/utils/route-context');
const dbConfig = require('../config/db');

async function discountRoutes(fastify) {
  let db;

  try {
    db = resolveDb(fastify);
  } catch (error) {
    db = dbConfig.sequelize || dbConfig;
  }

  db = createDbAdapter(db);
  const model = new DiscountModel(db);
  const service = new DiscountService({ model, db });
  const controller = createDiscountController(service);
  let adminPreHandler = null;

  try {
    adminPreHandler = resolveAdminPreHandler(fastify);
  } catch (error) {
    adminPreHandler = null;
  }

  fastify.route({
    method: 'POST',
    url: '/api/v1/admin/discounts',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.createAdminDiscount,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/admin/discounts',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.listAdminDiscounts,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/admin/discounts/:id',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.getAdminDiscountById,
  });

  fastify.route({
    method: 'PATCH',
    url: '/api/v1/admin/discounts/:id',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.updateAdminDiscountById,
  });

  fastify.route({
    method: 'DELETE',
    url: '/api/v1/admin/discounts/:id',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.deleteAdminDiscountById,
  });

  fastify.route({
    method: 'POST',
    url: '/api/v1/coupons/validate',
    handler: controller.validateCoupon,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/offers/active',
    handler: controller.getActiveOffers,
  });
}

module.exports = discountRoutes;
