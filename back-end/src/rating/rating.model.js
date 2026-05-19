const { parsePagination, buildPaginationMeta } = require('../common/utils/pagination');

const PUBLIC_SORT_COLUMNS = new Set(['created_at', 'rating']);
const ADMIN_SORT_COLUMNS = new Set(['created_at', 'updated_at', 'rating']);

class RatingModel {
  constructor(db) {
    this.db = db;
  }

  async productExists(productId, executor = this.db) {
    const { rows } = await executor.query('SELECT id FROM products WHERE id = $1 LIMIT 1', [productId]);
    return Boolean(rows[0]);
  }

  async findProductById(productId, executor = this.db) {
    const query = `
      SELECT
        p.id,
        p.status,
        c.is_active AS category_is_active
      FROM products p
      INNER JOIN categories c ON c.id = p.category_id
      WHERE p.id = $1
      LIMIT 1
    `;
    const { rows } = await executor.query(query, [productId]);
    return rows[0] || null;
  }

  async findByProductAndUser(productId, userId, executor = this.db) {
    const query = `
      SELECT *
      FROM product_reviews
      WHERE product_id = $1 AND user_id = $2
      LIMIT 1
    `;
    const { rows } = await executor.query(query, [productId, userId]);
    return rows[0] || null;
  }

  async findById(id, executor = this.db) {
    const query = `
      SELECT
        pr.*,
        u.name AS user_name,
        u.email AS user_email,
        p.name AS product_name,
        p.slug AS product_slug
      FROM product_reviews pr
      INNER JOIN users u ON u.id = pr.user_id
      INNER JOIN products p ON p.id = pr.product_id
      WHERE pr.id = $1
      LIMIT 1
    `;
    const { rows } = await executor.query(query, [id]);
    return rows[0] || null;
  }

  async create(payload, executor = this.db) {
    const query = `
      INSERT INTO product_reviews (
        product_id,
        user_id,
        rating,
        title,
        comment,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id
    `;
    const values = [
      payload.product_id,
      payload.user_id,
      payload.rating,
      payload.title ?? null,
      payload.comment ?? null,
    ];
    const { rows } = await executor.query(query, values);
    return rows[0] || null;
  }

  async updateById(id, payload, executor = this.db) {
    const fields = [];
    const values = [];

    Object.entries(payload).forEach(([key, value]) => {
      fields.push(`${key} = $${fields.length + 1}`);
      values.push(value);
    });

    if (!fields.length) return this.findById(id, executor);

    values.push(id);
    const query = `
      UPDATE product_reviews
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id
    `;
    const { rows } = await executor.query(query, values);
    return rows[0] || null;
  }

  async deleteById(id, executor = this.db) {
    const { rowCount } = await executor.query('DELETE FROM product_reviews WHERE id = $1', [id]);
    return rowCount > 0;
  }

  async listPublicByProduct(productId, filters = {}, executor = this.db) {
    const { page, limit, offset } = parsePagination(filters, { page: 1, limit: 10, maxLimit: 100 });
    const sortBy = PUBLIC_SORT_COLUMNS.has(filters.sort_by) ? filters.sort_by : 'created_at';
    const sortOrder = (filters.sort_order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM product_reviews
      WHERE product_id = $1
    `;
    const countResult = await executor.query(countQuery, [productId]);
    const total = countResult.rows[0]?.total || 0;

    const query = `
      SELECT
        pr.id,
        pr.product_id,
        pr.user_id,
        pr.rating,
        pr.title,
        pr.comment,
        pr.created_at,
        pr.updated_at,
        u.name AS user_name
      FROM product_reviews pr
      INNER JOIN users u ON u.id = pr.user_id
      WHERE pr.product_id = $1
      ORDER BY pr.${sortBy} ${sortOrder}, pr.id DESC
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await executor.query(query, [productId, limit, offset]);

    return {
      items: rows,
      meta: buildPaginationMeta({ page, limit, total }),
    };
  }

  async getPublicSummaryByProduct(productId, executor = this.db) {
    const query = `
      SELECT
        COUNT(*)::int AS total_reviews,
        COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average_rating,
        COUNT(*) FILTER (WHERE rating = 5)::int AS five_star,
        COUNT(*) FILTER (WHERE rating = 4)::int AS four_star,
        COUNT(*) FILTER (WHERE rating = 3)::int AS three_star,
        COUNT(*) FILTER (WHERE rating = 2)::int AS two_star,
        COUNT(*) FILTER (WHERE rating = 1)::int AS one_star
      FROM product_reviews
      WHERE product_id = $1
    `;
    const { rows } = await executor.query(query, [productId]);
    return rows[0] || {
      total_reviews: 0,
      average_rating: 0,
      five_star: 0,
      four_star: 0,
      three_star: 0,
      two_star: 0,
      one_star: 0,
    };
  }

  async listAdmin(filters = {}, executor = this.db) {
    const { page, limit, offset } = parsePagination(filters, { page: 1, limit: 20, maxLimit: 100 });
    const sortBy = ADMIN_SORT_COLUMNS.has(filters.sort_by) ? filters.sort_by : 'created_at';
    const sortOrder = (filters.sort_order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const values = [];
    const where = [];

    const push = (condition, value) => {
      values.push(value);
      where.push(`${condition} $${values.length}`);
    };

    if (filters.product_id) push('pr.product_id =', filters.product_id);
    if (filters.user_id) push('pr.user_id =', filters.user_id);
    if (filters.rating) push('pr.rating =', filters.rating);

    if (filters.search) {
      values.push(`%${filters.search}%`);
      where.push(`(
        p.name ILIKE $${values.length}
        OR p.slug ILIKE $${values.length}
        OR u.name ILIKE $${values.length}
        OR u.email ILIKE $${values.length}
        OR COALESCE(pr.title, '') ILIKE $${values.length}
        OR COALESCE(pr.comment, '') ILIKE $${values.length}
      )`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM product_reviews pr
      INNER JOIN users u ON u.id = pr.user_id
      INNER JOIN products p ON p.id = pr.product_id
      ${whereSql}
    `;
    const countResult = await executor.query(countQuery, values);
    const total = countResult.rows[0]?.total || 0;

    const query = `
      SELECT
        pr.id,
        pr.product_id,
        pr.user_id,
        pr.rating,
        pr.title,
        pr.comment,
        pr.created_at,
        pr.updated_at,
        u.name AS user_name,
        u.email AS user_email,
        p.name AS product_name,
        p.slug AS product_slug
      FROM product_reviews pr
      INNER JOIN users u ON u.id = pr.user_id
      INNER JOIN products p ON p.id = pr.product_id
      ${whereSql}
      ORDER BY pr.${sortBy} ${sortOrder}, pr.id DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const { rows } = await executor.query(query, [...values, limit, offset]);

    return {
      items: rows,
      meta: buildPaginationMeta({ page, limit, total }),
    };
  }
}

module.exports = RatingModel;
