const WishlistModel = require('./wishlist.model');
const { WishlistService } = require('./wishlist.service');
const { createWishlistController } = require('./wishlist.controller');
const { createDbAdapter } = require('../common/utils/db-adapter');
const { resolveDb } = require('../common/utils/route-context');
const dbConfig = require('../config/db');

async function wishlistRoutes(fastify) {
  let db;

  try {
    db = resolveDb(fastify);
  } catch (error) {
    db = dbConfig.sequelize || dbConfig;
  }

  db = createDbAdapter(db);
  const model = new WishlistModel(db);
  const service = new WishlistService({ model, db });
  const controller = createWishlistController(service);

  fastify.route({
    method: 'GET',
    url: '/api/v1/wishlist',
    handler: controller.getWishlist,
  });

  fastify.route({
    method: 'POST',
    url: '/api/v1/wishlist/items',
    handler: controller.addWishlistItem,
  });

  fastify.route({
    method: 'DELETE',
    url: '/api/v1/wishlist/items/:itemId',
    handler: controller.removeWishlistItem,
  });

  fastify.route({
    method: 'DELETE',
    url: '/api/v1/wishlist',
    handler: controller.clearWishlist,
  });
}

module.exports = wishlistRoutes;
