const { validate } = require('../common/utils/validation');
const { sendSuccess, sendError } = require('../common/utils/response');
const {
  resolveRequestActor,
  applyActorResponseHeaders,
} = require('../common/utils/request-actor');
const {
  addWishlistItemSchema,
  wishlistItemParamsSchema,
} = require('./wishlist.validation');

function createWishlistController(wishlistService) {
  return {
    getWishlist: async (request, reply) => {
      try {
        const actor = resolveRequestActor(request);
        applyActorResponseHeaders(reply, actor);
        const data = await wishlistService.getWishlist(actor);
        return sendSuccess(reply, {
          message: 'Wishlist fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    addWishlistItem: async (request, reply) => {
      try {
        const actor = resolveRequestActor(request);
        applyActorResponseHeaders(reply, actor);
        const payload = validate(addWishlistItemSchema, request.body || {});
        const data = await wishlistService.addItem(actor, payload);
        return sendSuccess(reply, {
          statusCode: 201,
          message: 'Item added to wishlist successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    removeWishlistItem: async (request, reply) => {
      try {
        const actor = resolveRequestActor(request);
        applyActorResponseHeaders(reply, actor);
        const params = validate(wishlistItemParamsSchema, request.params || {});
        const data = await wishlistService.removeItem(actor, params.itemId);
        return sendSuccess(reply, {
          message: 'Wishlist item removed successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    clearWishlist: async (request, reply) => {
      try {
        const actor = resolveRequestActor(request);
        applyActorResponseHeaders(reply, actor);
        const data = await wishlistService.clearWishlist(actor);
        return sendSuccess(reply, {
          message: 'Wishlist cleared successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },
  };
}

module.exports = {
  createWishlistController,
};
