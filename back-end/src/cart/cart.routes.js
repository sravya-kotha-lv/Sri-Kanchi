const CartModel = require('./cart.model');
const { CartService } = require('./cart.service');
const { createCartController } = require('./cart.controller');
const { createDbAdapter } = require('../common/utils/db-adapter');
const { resolveDb } = require('../common/utils/route-context');
const dbConfig = require('../config/db');

async function cartRoutes(fastify) {
  let db;

  try {
    db = resolveDb(fastify);
  } catch (error) {
    db = dbConfig.sequelize || dbConfig;
  }

  db = createDbAdapter(db);
  const model = new CartModel(db);
  const service = new CartService({ model, db });
  const controller = createCartController(service);

  fastify.route({
    method: 'GET',
    url: '/api/v1/cart',
    handler: controller.getCart,
  });

  fastify.route({
    method: 'POST',
    url: '/api/v1/cart/items',
    handler: controller.addCartItem,
  });

  fastify.route({
    method: 'PATCH',
    url: '/api/v1/cart/items/:itemId',
    handler: controller.updateCartItem,
  });

  fastify.route({
    method: 'DELETE',
    url: '/api/v1/cart/items/:itemId',
    handler: controller.removeCartItem,
  });

  fastify.route({
    method: 'DELETE',
    url: '/api/v1/cart',
    handler: controller.clearCart,
  });
}

module.exports = cartRoutes;
