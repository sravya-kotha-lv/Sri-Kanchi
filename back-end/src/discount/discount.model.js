const { parsePagination, buildPaginationMeta } = require('../common/utils/pagination');

const DISCOUNT_COLUMNS = [
  'title',
  'code',
  'description',
  'type',
  'value',
  'applies_to',
  'product_id',
  'category_id',
  'min_order_amount',
  'max_discount_amount',
  'starts_at',
  'ends_at',
  'usage_limit',
  'per_user_limit',
  'is_active',
];

const ALLOWED_SORT_COLUMNS = new Set([
  'id',
  'title',
  'code',
  'type',
  'value',
  'starts_at',
  'ends_at',
  'created_at',
  'updated_at',
]);

class DiscountModel {
  constructor(db) {
    this.db = db;
  }

  async existsByCode(code, excludeId, executor = this.db) {
    const values = [code];
    let query = 'SELECT id FROM discounts WHERE code = $1';
    if (excludeId) {
      values.push(excludeId);
      query += ` AND id <> $${values.length}`;
    }
    query += ' LIMIT 1';
    const { rows } = await executor.query(query, values);
    return Boolean(rows[0]);
  }

  async create(payload, executor = this.db) {
    const columns = DISCOUNT_COLUMNS.filter((key) => payload[key] !== undefined);
    const values = columns.map((key) => payload[key]);
    const placeholders = values.map((_, idx) => `$${idx + 1}`);

    const query = `
      INSERT INTO discounts (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    const { rows } = await executor.query(query, values);
    return rows[0];
  }

  async findById(id, executor = this.db) {
    const { rows } = await executor.query('SELECT * FROM discounts WHERE id = $1 LIMIT 1', [id]);
    return rows[0] || null;
  }

  async updateById(id, payload, executor = this.db) {
    const keys = DISCOUNT_COLUMNS.filter((key) => payload[key] !== undefined);
    if (!keys.length) return this.findById(id, executor);

    const values = keys.map((key) => payload[key]);
    const sets = keys.map((key, idx) => `${key} = $${idx + 1}`);
    values.push(id);
    sets.push('updated_at = NOW()');

    const query = `
      UPDATE discounts
      SET ${sets.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
    `;
    const { rows } = await executor.query(query, values);
    return rows[0] || null;
  }

  async deleteById(id, executor = this.db) {
    const query = 'DELETE FROM discounts WHERE id = $1';
    const { rowCount } = await executor.query(query, [id]);
    return rowCount > 0;
  }

  buildWhereClause(filters = {}, activeOnly = false) {
    const where = [];
    const values = [];
    const push = (condition, value) => {
      values.push(value);
      where.push(`${condition} $${values.length}`);
    };

    if (activeOnly) {
      where.push('is_active = TRUE');
      where.push('NOW() BETWEEN starts_at AND ends_at');
    } else {
      if (filters.is_active !== undefined) push('is_active =', filters.is_active);
      if (filters.status === 'active') {
        where.push('is_active = TRUE');
        where.push('NOW() BETWEEN starts_at AND ends_at');
      } else if (filters.status === 'inactive') {
        where.push('(is_active = FALSE OR NOW() NOT BETWEEN starts_at AND ends_at)');
      }
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      const i = values.length;
      where.push(`(title ILIKE $${i} OR code ILIKE $${i} OR description ILIKE $${i})`);
    }
    if (filters.type) push('type =', filters.type);
    if (filters.applies_to) push('applies_to =', filters.applies_to);

    if (filters.product_id) {
      values.push(filters.product_id);
      const i = values.length;
      where.push(`(applies_to = 'all' OR (applies_to = 'product' AND product_id = $${i}))`);
    }

    if (filters.category_id) {
      values.push(filters.category_id);
      const i = values.length;
      where.push(`(applies_to = 'all' OR (applies_to = 'category' AND category_id = $${i}))`);
    }

    return {
      whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
      values,
    };
  }

  async list(filters = {}, activeOnly = false, executor = this.db) {
    const { page, limit, offset } = parsePagination(filters, { page: 1, limit: 20, maxLimit: 100 });
    const sortBy = ALLOWED_SORT_COLUMNS.has(filters.sort_by) ? filters.sort_by : 'created_at';
    const sortOrder = (filters.sort_order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { whereSql, values } = this.buildWhereClause(filters, activeOnly);
    const countQuery = `SELECT COUNT(*)::int AS total FROM discounts ${whereSql}`;
    const countResult = await executor.query(countQuery, values);
    const total = countResult.rows[0]?.total || 0;

    const listValues = [...values, limit, offset];
    const query = `
      SELECT *
      FROM discounts
      ${whereSql}
      ORDER BY ${sortBy} ${sortOrder}, id DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const { rows } = await executor.query(query, listValues);

    return {
      items: rows,
      meta: buildPaginationMeta({ page, limit, total }),
    };
  }

  async findApplicableByCode(code, { product_id, category_id }, executor = this.db) {
    const values = [code];
    const clauses = [
      'code = $1',
      'is_active = TRUE',
      'NOW() BETWEEN starts_at AND ends_at',
      `(
        applies_to = 'all'
        OR (applies_to = 'product' AND product_id = $2)
        OR (applies_to = 'category' AND category_id = $3)
      )`,
    ];

    values.push(product_id || null, category_id || null);

    const query = `
      SELECT *
      FROM discounts
      WHERE ${clauses.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const { rows } = await executor.query(query, values);
    return rows[0] || null;
  }
}

module.exports = DiscountModel;
