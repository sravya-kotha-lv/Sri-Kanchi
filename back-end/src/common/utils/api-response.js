const successResponse = ({
  message = "Request completed successfully",
  data = null,
  meta = null,
}) => ({
  success: true,
  message,
  data,
  meta,
});

const errorResponse = ({
  message = "Something went wrong",
  errors = null,
}) => ({
  success: false,
  message,
  errors,
});

module.exports = {
  successResponse,
  errorResponse,
};
