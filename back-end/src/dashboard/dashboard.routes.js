const DashboardModel = require('./dashboard.model');
const { DashboardService } = require('./dashboard.service');
const { createDashboardController } = require('./dashboard.controller');
const { createDbAdapter } = require('../common/utils/db-adapter');
const { resolveDb, resolveAdminPreHandler } = require('../common/utils/route-context');
const dbConfig = require('../config/db');

async function dashboardRoutes(fastify) {
  let db;

  try {
    db = resolveDb(fastify);
  } catch (error) {
    db = dbConfig.sequelize || dbConfig;
  }

  db = createDbAdapter(db);
  const model = new DashboardModel(db);
  const service = new DashboardService({ model });
  const controller = createDashboardController(service);
  let adminPreHandler = null;

  try {
    adminPreHandler = resolveAdminPreHandler(fastify);
  } catch (error) {
    adminPreHandler = null;
  }

  fastify.route({
    method: 'GET',
    url: '/api/v1/admin/dashboard/summary',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.getSummary,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/admin/dashboard/top-products',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.getTopProducts,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/admin/dashboard/low-stock',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.getLowStock,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/admin/dashboard/category-summary',
    ...(adminPreHandler ? { preHandler: adminPreHandler } : {}),
    handler: controller.getCategorySummary,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/public/dashboard/home',
    handler: controller.getPublicHome,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/public/dashboard/hero-banners',
    handler: controller.getPublicHeroBanners,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/public/dashboard/featured-categories',
    handler: controller.getPublicFeaturedCategories,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/public/dashboard/top-deals',
    handler: controller.getPublicTopDeals,
  });

  fastify.route({
    method: 'GET',
    url: '/api/v1/public/dashboard/trending-products',
    handler: controller.getPublicTrendingProducts,
  });
}

module.exports = dashboardRoutes;
