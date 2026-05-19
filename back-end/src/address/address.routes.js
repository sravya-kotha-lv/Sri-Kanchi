const AddressModel = require("./address.model");
const { AddressService } = require("./address.service");
const { createAddressController } = require("./address.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { createDbAdapter } = require("../common/utils/db-adapter");
const { resolveDb } = require("../common/utils/route-context");
const dbConfig = require("../config/db");

async function addressRoutes(fastify) {
  let db;

  try {
    db = resolveDb(fastify);
  } catch (error) {
    db = dbConfig.sequelize || dbConfig;
  }

  db = createDbAdapter(db);

  const model = new AddressModel(db);
  const service = new AddressService({ model, db });
  const controller = createAddressController(service);

  fastify.route({
    method: "GET",
    url: "/api/v1/addresses",
    preHandler: [authenticate],
    handler: controller.listAddresses,
  });

  fastify.route({
    method: "POST",
    url: "/api/v1/addresses",
    preHandler: [authenticate],
    handler: controller.createAddress,
  });

  fastify.route({
    method: "GET",
    url: "/api/v1/addresses/:id",
    preHandler: [authenticate],
    handler: controller.getAddress,
  });

  fastify.route({
    method: "PATCH",
    url: "/api/v1/addresses/:id",
    preHandler: [authenticate],
    handler: controller.updateAddress,
  });

  fastify.route({
    method: "PATCH",
    url: "/api/v1/addresses/:id/default",
    preHandler: [authenticate],
    handler: controller.setDefaultAddress,
  });

  fastify.route({
    method: "DELETE",
    url: "/api/v1/addresses/:id",
    preHandler: [authenticate],
    handler: controller.deleteAddress,
  });
}

module.exports = addressRoutes;
