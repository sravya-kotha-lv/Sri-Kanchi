const { errorResponse } = require("../common/utils/api-response");

const registerErrorHandler = (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    const statusCode = error.statusCode || 500;
    const errors = error.details || null;

    reply.code(statusCode).send(
      errorResponse({
        message: error.message || "Internal server error",
        errors,
      })
    );
  });
};

module.exports = registerErrorHandler;
