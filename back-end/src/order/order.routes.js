const OrderModel = require("./order.model");
const { OrderService } = require("./order.service");
const { createOrderController } = require("./order.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { createDbAdapter } = require("../common/utils/db-adapter");
const { resolveDb } = require("../common/utils/route-context");
const dbConfig = require("../config/db");
const { authorize } = require("../middleware/role.middleware");


async function orderRoutes(fastify) {
  let db;

  try {
    db = resolveDb(fastify);
  } catch (error) {
    db = dbConfig.sequelize || dbConfig;
  }

  db = createDbAdapter(db);

  const model = new OrderModel(db);
  const service = new OrderService({ model, db });
  const controller = createOrderController(service);
  const adminOnly = authorize("admin");


  fastify.route({
    method: "POST",
    url: "/api/v1/orders",
    preHandler: [authenticate],
    handler: controller.placeOrder,
  });

  fastify.route({
    method: "GET",
    url: "/api/v1/orders",
    preHandler: [authenticate],
    handler: controller.getOrders,
  });

  fastify.route({
    method: "GET",
    url: "/api/v1/orders/:id",
    preHandler: [authenticate],
    handler: controller.getOrderById,
  });


  fastify.route({
  method: "PATCH",
  url: "/api/v1/orders/:id/cancel",
  preHandler: [authenticate],
  handler: controller.cancelOrder,
});

fastify.route({
  method: "GET",
  url: "/api/v1/admin/orders/summary",
  preHandler: [authenticate, adminOnly],
  handler: controller.getAdminOrderSummary,
});

fastify.route({
  method: "GET",
  url: "/api/v1/admin/orders",
  preHandler: [authenticate, adminOnly],
  handler: controller.getAdminOrders,
});

fastify.route({
  method: "GET",
  url: "/api/v1/admin/orders/:id",
  preHandler: [authenticate, adminOnly],
  handler: controller.getAdminOrderById,
});



}

module.exports = orderRoutes;
