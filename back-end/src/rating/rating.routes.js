const RatingModel = require('./rating.model');
const { RatingService } = require('./rating.service');
const { createRatingController } = require('./rating.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { createDbAdapter } = require('../common/utils/db-adapter');
const { resolveDb } = require('../common/utils/route-context');
const dbConfig = require('../config/db');

async function ratingRoutes(fastify) {
  let db;

  try {
    db = resolveDb(fastify);
  } catch (error) {
    db = dbConfig.sequelize || dbConfig;
  }

  db = createDbAdapter(db);

  const model = new RatingModel(db);
  const service = new RatingService({ model, db });
  const controller = createRatingController(service);

  fastify.route({
    method: 'GET',
    url: '/api/v1/products/:productId/reviews',
    handler: controller.listPublicReviews,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/products/:productId/rating-summary',
    handler: controller.getPublicSummary,
  });

  fastify.route({
    method: 'POST',
    url: '/api/v1/products/:productId/reviews',
    preHandler: [authenticate],
    handler: controller.createReview,
  });

  fastify.route({
    method: 'PATCH',
    url: '/api/v1/reviews/:id',
    preHandler: [authenticate],
    handler: controller.updateOwnReview,
  });

  fastify.route({
    method: 'DELETE',
    url: '/api/v1/reviews/:id',
    preHandler: [authenticate],
    handler: controller.deleteOwnReview,
  });
}

module.exports = ratingRoutes;
