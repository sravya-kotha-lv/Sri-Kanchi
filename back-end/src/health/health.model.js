const db = require("../db/postgres");

const pingDatabase = async () => {
  await db.query("SELECT 1");
  return true;
};

module.exports = {
  pingDatabase,
};
