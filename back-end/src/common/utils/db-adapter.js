const createSqlExecutor = (source, transaction = null) => {
  const sequelize = source?.sequelize || source;

  return {
    query: async (text, params = []) => {
      const [rows, metadata] = await sequelize.query(text, {
        bind: params,
        transaction,
      });

      return {
        rows: Array.isArray(rows) ? rows : [],
        rowCount: metadata?.rowCount ?? (Array.isArray(rows) ? rows.length : 0),
      };
    },
  };
};

const createDbAdapter = (source) => {
  const sequelize = source?.sequelize || source;

  return {
    ...createSqlExecutor(sequelize),
    connect: async () => {
      const transaction = await sequelize.transaction();

      return {
        ...createSqlExecutor(sequelize, transaction),
        commit: async () => transaction.commit(),
        rollback: async () => transaction.rollback(),
        release: () => {},
      };
    },
  };
};

module.exports = {
  createSqlExecutor,
  createDbAdapter,
};
