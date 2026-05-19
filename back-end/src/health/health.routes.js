const healthController = require("./health.controller");

async function healthRoutes(fastify) {
  fastify.get("/health", healthController.getHealth);
}

module.exports = healthRoutes;
