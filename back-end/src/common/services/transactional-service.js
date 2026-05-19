class TransactionalService {
  constructor(db) {
    this.db = db;
  }

  async withTransaction(handler) {
    if (!this.db || typeof this.db.connect !== 'function') {
      return handler(this.db);
    }

    const client = await this.db.connect();
    try {
      const result = await handler(client);

      if (typeof client.commit === 'function') {
        await client.commit();
      } else {
        await client.query('COMMIT');
      }

      return result;
    } catch (error) {
      if (typeof client.rollback === 'function') {
        await client.rollback();
      } else {
        await client.query('ROLLBACK');
      }

      throw error;
    } finally {
      if (typeof client.release === 'function') {
        client.release();
      }
    }
  }
}

module.exports = TransactionalService;
