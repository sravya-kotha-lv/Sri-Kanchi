const { successResponse } = require("../common/utils/api-response");
const healthService = require("./health.service");

const getHealth = async (request, reply) => {
  const health = await healthService.getHealthStatus();

  return reply.code(200).send(
    successResponse({
      message: "Health check fetched successfully",
      data: health,
    })
  );
};

module.exports = {
  getHealth,
};
