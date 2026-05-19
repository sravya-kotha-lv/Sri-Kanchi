const { validate } = require('../common/utils/validation');
const { sendSuccess, sendError } = require('../common/utils/response');
const {
  resolveRequestActor,
  applyActorResponseHeaders,
} = require('../common/utils/request-actor');
const {
  addCartItemSchema,
  updateCartItemSchema,
  cartItemParamsSchema,
} = require('./cart.validation');

function createCartController(cartService) {
  return {
    getCart: async (request, reply) => {
      try {
        const actor = resolveRequestActor(request);
        applyActorResponseHeaders(reply, actor);
        const data = await cartService.getCart(actor);
        return sendSuccess(reply, {
          message: 'Cart fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    addCartItem: async (request, reply) => {
      try {
        const actor = resolveRequestActor(request);
        applyActorResponseHeaders(reply, actor);
        const payload = validate(addCartItemSchema, request.body || {});
        const data = await cartService.addItem(actor, payload);
        return sendSuccess(reply, {
          statusCode: 201,
          message: 'Item added to cart successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    updateCartItem: async (request, reply) => {
      try {
        const actor = resolveRequestActor(request);
        applyActorResponseHeaders(reply, actor);
        const params = validate(cartItemParamsSchema, request.params || {});
        const payload = validate(updateCartItemSchema, request.body || {});
        const data = await cartService.updateItem(actor, params.itemId, payload);
        return sendSuccess(reply, {
          message: 'Cart item updated successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    removeCartItem: async (request, reply) => {
      try {
        const actor = resolveRequestActor(request);
        applyActorResponseHeaders(reply, actor);
        const params = validate(cartItemParamsSchema, request.params || {});
        const data = await cartService.removeItem(actor, params.itemId);
        return sendSuccess(reply, {
          message: 'Cart item removed successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    clearCart: async (request, reply) => {
      try {
        const actor = resolveRequestActor(request);
        applyActorResponseHeaders(reply, actor);
        const data = await cartService.clearCart(actor);
        return sendSuccess(reply, {
          message: 'Cart cleared successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },
  };
}

module.exports = {
  createCartController,
};
