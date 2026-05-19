const env = require("../config/env");
const healthModel = require("./health.model");

const getHealthStatus = async () => {
  await healthModel.pingDatabase();

  return {
    status: "ok",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    database: "connected",
  };
};

module.exports = {
  getHealthStatus,
};
