const jwt = require("jsonwebtoken");
const env = require("../config/env");
const AppError = require("../common/errors/app-error");
const { decryptTokenPayload } = require("../common/utils/token-crypto");

const authenticate = async (request) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Unauthorized", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    request.user = decryptTokenPayload(payload.data);
  } catch (error) {
    throw new AppError("Invalid or expired token", 401);
  }
};

module.exports = {
  authenticate,
};
