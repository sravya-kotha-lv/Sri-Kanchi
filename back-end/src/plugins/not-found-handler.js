const { errorResponse } = require("../common/utils/api-response");

const registerNotFoundHandler = (fastify) => {
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send(
      errorResponse({
        message: `Route not found: ${request.method} ${request.url}`,
      })
    );
  });
};

module.exports = registerNotFoundHandler;
