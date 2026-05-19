const AppError = require("../common/errors/app-error");
const logger = require("../common/utils/logger");

const authorize =
  (...allowedRoles) =>
  async (request) => {
    logger.log("Authorizing user with role:", request.user?.role);
    console.log("Authorizing user with role:", request.user?.role);
    if (!request.user) {
      throw new AppError("Unauthorized", 401);
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new AppError("Forbidden", 403);
    }
  };

module.exports = {
  authorize,
};
