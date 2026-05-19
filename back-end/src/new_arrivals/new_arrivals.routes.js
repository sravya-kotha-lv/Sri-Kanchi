const { subscribeToNewArrivals } = require("./new_arrivals.controller");
const { validateRequest } = require("../common/utils/request-validation");
const { newArrivalEmailBody } = require("./new_arrivals.validation");
const env = require("../config/env");

async function newArrivalsRoutes(fastify) {
  fastify.post(
    `${env.apiPrefix}/new-arrivals/notify`,
    {
      preValidation: [validateRequest(newArrivalEmailBody)],
    },
    subscribeToNewArrivals
  );
}

module.exports = newArrivalsRoutes;
