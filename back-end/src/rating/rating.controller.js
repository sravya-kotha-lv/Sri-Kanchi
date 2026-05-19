const {
  validate,
  productIdParamsSchema,
  reviewIdParamsSchema,
  createReviewSchema,
  updateReviewSchema,
  publicReviewListQuerySchema,
} = require('./rating.validation');
const { sendSuccess, sendError, sendPaginatedSuccess } = require('../common/utils/response');

function createRatingController(ratingService) {
  return {
    createReview: async (request, reply) => {
      try {
        const params = validate(productIdParamsSchema, request.params || {});
        const payload = validate(createReviewSchema, request.body || {});
        const data = await ratingService.createReview(params.productId, request.user.id, payload);
        return sendSuccess(reply, {
          statusCode: 201,
          message: 'Review created successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    listPublicReviews: async (request, reply) => {
      try {
        const params = validate(productIdParamsSchema, request.params || {});
        const query = validate(publicReviewListQuerySchema, request.query || {});
        const result = await ratingService.listPublicReviews(params.productId, query);
        return sendPaginatedSuccess(reply, {
          message: 'Product reviews fetched successfully',
          items: result.items,
          meta: result.meta,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getPublicSummary: async (request, reply) => {
      try {
        const params = validate(productIdParamsSchema, request.params || {});
        const data = await ratingService.getPublicSummary(params.productId);
        return sendSuccess(reply, {
          message: 'Rating summary fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    updateOwnReview: async (request, reply) => {
      try {
        const params = validate(reviewIdParamsSchema, request.params || {});
        const payload = validate(updateReviewSchema, request.body || {});
        const data = await ratingService.updateOwnReview(params.id, request.user.id, payload);
        return sendSuccess(reply, {
          message: 'Review updated successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    deleteOwnReview: async (request, reply) => {
      try {
        const params = validate(reviewIdParamsSchema, request.params || {});
        await ratingService.deleteReview(params.id, request.user);
        return sendSuccess(reply, {
          message: 'Review deleted successfully',
          data: null,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },
  };
}

module.exports = {
  createRatingController,
};
