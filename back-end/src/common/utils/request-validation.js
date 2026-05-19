const validateRequest = (schema, target = "body") => async (request, reply) => {
  if (!schema) {
    return;
  }

  const { error, value } = schema.validate(request[target], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return reply.code(400).send({
      success: false,
      message: "Validation failed",
      errors: error.details.map((detail) => ({
        message: detail.message,
        path: detail.path,
      })),
    });
  }

  request[target] = value;
};

module.exports = {
  validateRequest,
};
