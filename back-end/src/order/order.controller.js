const { validate } = require("../common/utils/validation");
const { sendSuccess, sendError } = require("../common/utils/response");
const { resolveRequestActor } = require("../common/utils/request-actor");
const {
  placeOrderSchema,
  orderParamsSchema,
} = require("./order.validation");

function createOrderController(orderService) {
  return {
    placeOrder: async (request, reply) => {
      try {
        const actor = resolveRequestActor(request);
        const payload = validate(placeOrderSchema, request.body || {});
        const data = await orderService.placeOrder(actor, payload);

        return sendSuccess(reply, {
          statusCode: 201,
          message: "Order placed successfully",
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getOrders: async (request, reply) => {
      try {
        const data = await orderService.getOrders(request.user.id);

        return sendSuccess(reply, {
          message: "Orders fetched successfully",
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getOrderById: async (request, reply) => {
      try {
        const params = validate(orderParamsSchema, request.params || {});
        const data = await orderService.getOrderById(request.user.id, params.id);

        return sendSuccess(reply, {
          message: "Order fetched successfully",
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },


    cancelOrder: async (request, reply) => {
  try {
    const params = validate(orderParamsSchema, request.params || {});
    const data = await orderService.cancelOrder(request.user.id, params.id);

    return sendSuccess(reply, {
      message: "Order cancelled successfully",
      data,
    });
  } catch (error) {
    return sendError(reply, error);
  }
},
getAdminOrders: async (request, reply) => {
  try {
    const data = await orderService.getAdminOrders(request.query || {});

    return sendSuccess(reply, {
      message: "Admin orders fetched successfully",
      data,
    });
  } catch (error) {
    return sendError(reply, error);
  }
},

getAdminOrderSummary: async (request, reply) => {
  try {
    const data = await orderService.getAdminOrderSummary();

    return sendSuccess(reply, {
      message: "Admin order summary fetched successfully",
      data,
    });
  } catch (error) {
    return sendError(reply, error);
  }
},

getAdminOrderById: async (request, reply) => {
  try {
    const params = validate(orderParamsSchema, request.params || {});
    const data = await orderService.getAdminOrderById(params.id);

    return sendSuccess(reply, {
      message: "Admin order fetched successfully",
      data,
    });
  } catch (error) {
    return sendError(reply, error);
  }
},


  };
}

module.exports = {
  createOrderController,
};
