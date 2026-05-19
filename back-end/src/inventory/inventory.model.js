const { parsePagination, buildPaginationMeta } = require('../common/utils/pagination');

const INVENTORY_COLUMNS = [
  'product_id',
  'available_stock',
  'reserved_stock',
  'low_stock_threshold',
  'stock_status',
];

const ALLOWED_SORT_COLUMNS = new Set([
  'id',
  'product_id',
  'available_stock',
  'reserved_stock',
  'low_stock_threshold',
  'updated_at',
]);

class InventoryModel {
  constructor(db) {
    this.db = db;
  }

  async findByProductId(productId, executor = this.db) {
    const query = `
      SELECT i.*, p.name AS product_name, p.sku
      FROM inventory i
      LEFT JOIN products p ON p.id = i.product_id
      WHERE i.product_id = $1
      LIMIT 1
    `;
    const { rows } = await executor.query(query, [productId]);
    return rows[0] || null;
  }

  async findByProductIdForUpdate(productId, executor = this.db) {
    const query = `
      SELECT *
      FROM inventory
      WHERE product_id = $1
      LIMIT 1
      FOR UPDATE
    `;
    const { rows } = await executor.query(query, [productId]);
    return rows[0] || null;
  }

  async getProductById(productId, executor = this.db) {
    const { rows } = await executor.query(
      'SELECT id, name, sku, stock FROM products WHERE id = $1 LIMIT 1',
      [productId]
    );
    return rows[0] || null;
  }

  async create(payload, executor = this.db) {
    const columns = INVENTORY_COLUMNS.filter((key) => payload[key] !== undefined);
    const values = columns.map((key) => payload[key]);
    const placeholders = values.map((_, idx) => `$${idx + 1}`);
    const query = `
      INSERT INTO inventory (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    const { rows } = await executor.query(query, values);
    return rows[0];
  }

  async updateByProductId(productId, payload, executor = this.db) {
    const keys = INVENTORY_COLUMNS.filter((key) => key !== 'product_id' && payload[key] !== undefined);
    if (!keys.length) return this.findByProductId(productId, executor);

    const values = keys.map((key) => payload[key]);
    const sets = keys.map((key, idx) => `${key} = $${idx + 1}`);
    sets.push('updated_at = NOW()');
    values.push(productId);

    const query = `
      UPDATE inventory
      SET ${sets.join(', ')}
      WHERE product_id = $${values.length}
      RETURNING *
    `;
    const { rows } = await executor.query(query, values);
    return rows[0] || null;
  }

  async upsertByProductId(payload, executor = this.db) {
    const query = `
      INSERT INTO inventory (
        product_id,
        available_stock,
        reserved_stock,
        low_stock_threshold,
        stock_status
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (product_id)
      DO UPDATE SET
        available_stock = EXCLUDED.available_stock,
        reserved_stock = EXCLUDED.reserved_stock,
        low_stock_threshold = EXCLUDED.low_stock_threshold,
        stock_status = EXCLUDED.stock_status,
        updated_at = NOW()
      RETURNING *
    `;
    const values = [
      payload.product_id,
      payload.available_stock,
      payload.reserved_stock,
      payload.low_stock_threshold,
      payload.stock_status,
    ];
    const { rows } = await executor.query(query, values);
    return rows[0];
  }

  async syncProductStock(productId, availableStock, executor = this.db) {
    await executor.query('UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2', [
      availableStock,
      productId,
    ]);
  }

  buildWhereClause(filters = {}) {
    const where = [];
    const values = [];

    if (filters.search) {
      values.push(`%${filters.search}%`);
      const i = values.length;
      where.push(`(p.name ILIKE $${i} OR p.sku ILIKE $${i} OR p.slug ILIKE $${i})`);
    }

    if (filters.stock_status) {
      values.push(filters.stock_status);
      where.push(`i.stock_status = $${values.length}`);
    }

    if (filters.low_stock_only) {
      where.push('i.available_stock <= i.low_stock_threshold AND i.available_stock > 0');
    }

    return {
      whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
      values,
    };
  }

  async list(filters = {}, executor = this.db) {
    const { page, limit, offset } = parsePagination(filters, { page: 1, limit: 20, maxLimit: 100 });
    const sortBy = ALLOWED_SORT_COLUMNS.has(filters.sort_by) ? filters.sort_by : 'updated_at';
    const sortOrder = (filters.sort_order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { whereSql, values } = this.buildWhereClause(filters);
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM inventory i
      LEFT JOIN products p ON p.id = i.product_id
      ${whereSql}
    `;
    const countResult = await executor.query(countQuery, values);
    const total = countResult.rows[0]?.total || 0;

    const listValues = [...values, limit, offset];
    const dataQuery = `
      SELECT i.*, p.name AS product_name, p.slug, p.sku
      FROM inventory i
      LEFT JOIN products p ON p.id = i.product_id
      ${whereSql}
      ORDER BY i.${sortBy} ${sortOrder}, i.id DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const listResult = await executor.query(dataQuery, listValues);

    return {
      items: listResult.rows,
      meta: buildPaginationMeta({ page, limit, total }),
    };
  }

  async listLowStock(filters = {}, executor = this.db) {
    const { page, limit, offset } = parsePagination(filters, { page: 1, limit: 20, maxLimit: 100 });
    const sortBy = ALLOWED_SORT_COLUMNS.has(filters.sort_by) ? filters.sort_by : 'updated_at';
    const sortOrder = (filters.sort_order || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM inventory
      WHERE available_stock <= low_stock_threshold AND available_stock > 0
    `;
    const countResult = await executor.query(countQuery);
    const total = countResult.rows[0]?.total || 0;

    const query = `
      SELECT i.*, p.name AS product_name, p.slug, p.sku
      FROM inventory i
      LEFT JOIN products p ON p.id = i.product_id
      WHERE i.available_stock <= i.low_stock_threshold
        AND i.available_stock > 0
      ORDER BY i.${sortBy} ${sortOrder}, i.id DESC
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await executor.query(query, [limit, offset]);

    return {
      items: rows,
      meta: buildPaginationMeta({ page, limit, total }),
    };
  }
}

module.exports = InventoryModel;
