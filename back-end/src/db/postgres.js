const { Pool } = require("pg");
const env = require("../config/env");
const logger = require("../common/utils/logger");

const pool = new Pool({
  ...env.db,
  options: "-c timezone=UTC",
});


pool.on("error", (error) => {
  logger.error("Unexpected PostgreSQL client error", error);
});

const query = (text, params) => pool.query(text, params);

const withTransaction = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  withTransaction,
};
