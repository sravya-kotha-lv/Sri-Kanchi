const {
  validate,
  summaryQuerySchema,
  topProductsQuerySchema,
  lowStockQuerySchema,
  categorySummaryQuerySchema,
  publicDashboardHomeQuerySchema,
  publicDashboardSectionQuerySchema,
} = require('./dashboard.validation');
const { sendSuccess, sendError } = require('../common/utils/response');

function createDashboardController(dashboardService) {
  return {
    getSummary: async (request, reply) => {
      try {
        validate(summaryQuerySchema, request.query || {});
        const data = await dashboardService.getSummary();
        return sendSuccess(reply, {
          message: 'Dashboard summary fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getTopProducts: async (request, reply) => {
      try {
        const query = validate(topProductsQuerySchema, request.query || {});
        const data = await dashboardService.getTopProducts(query);
        return sendSuccess(reply, {
          message: 'Top products fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getLowStock: async (request, reply) => {
      try {
        const query = validate(lowStockQuerySchema, request.query || {});
        const data = await dashboardService.getLowStockProducts(query);
        return sendSuccess(reply, {
          message: 'Low stock products fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getCategorySummary: async (request, reply) => {
      try {
        const query = validate(categorySummaryQuerySchema, request.query || {});
        const data = await dashboardService.getCategorySummary(query);
        return sendSuccess(reply, {
          message: 'Category summary fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getPublicHome: async (request, reply) => {
      try {
        const query = validate(publicDashboardHomeQuerySchema, request.query || {});
        const data = await dashboardService.getPublicHome(query);
        return sendSuccess(reply, {
          message: 'Public dashboard fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getPublicHeroBanners: async (request, reply) => {
      try {
        const query = validate(publicDashboardSectionQuerySchema, request.query || {});
        const data = await dashboardService.getPublicHeroBanners(query);
        return sendSuccess(reply, {
          message: 'Public hero banners fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getPublicFeaturedCategories: async (request, reply) => {
      try {
        const query = validate(publicDashboardSectionQuerySchema, request.query || {});
        const data = await dashboardService.getPublicFeaturedCategories(query);
        return sendSuccess(reply, {
          message: 'Public featured categories fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getPublicTopDeals: async (request, reply) => {
      try {
        const query = validate(publicDashboardSectionQuerySchema, request.query || {});
        const data = await dashboardService.getPublicTopDeals(query);
        return sendSuccess(reply, {
          message: 'Public top deals fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getPublicTrendingProducts: async (request, reply) => {
      try {
        const query = validate(publicDashboardSectionQuerySchema, request.query || {});
        const data = await dashboardService.getPublicTrendingProducts(query);
        return sendSuccess(reply, {
          message: 'Public trending products fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },
  };
}

module.exports = {
  createDashboardController,
};
