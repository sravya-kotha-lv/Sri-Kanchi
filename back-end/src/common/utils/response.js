function sendSuccess(reply, { statusCode = 200, message, data, meta }) {
  return reply.code(statusCode).send({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

function sendError(reply, error) {
  const statusCode = error.statusCode || 500;
  return reply.code(statusCode).send({
    success: false,
    message: error.message || 'Something went wrong',
    code: error.code || 'INTERNAL_SERVER_ERROR',
    ...(error.details ? { details: error.details } : {}),
  });
}

function sendPaginatedSuccess(reply, { message, items, meta, statusCode = 200 }) {
  return sendSuccess(reply, {
    statusCode,
    message,
    data: items,
    meta,
  });
}

module.exports = {
  sendSuccess,
  sendError,
  sendPaginatedSuccess,
};
