const { parsePagination, buildPaginationMeta } = require('../common/utils/pagination');

const PRODUCT_COLUMNS = [
  'name',
  'slug',
  'sku',
  'short_description',
  'description',
  'category_id',
  'fabric',
  'occasion',
  'color',
  'blouse_included',
  'mrp',
  'selling_price',
  'stock',
  'is_new_arrival',
  'status',
  'created_by',
  'updated_by',
];

const ALLOWED_SORT_COLUMNS = new Set([
  'id',
  'name',
  'slug',
  'sku',
  'mrp',
  'selling_price',
  'stock',
  'created_at',
  'updated_at',
]);

class ProductModel {
  constructor(db) {
    this.db = db;
  }

  async existsBySlug(slug, excludeId, executor = this.db) {
    const values = [slug];
    let query = 'SELECT id FROM products WHERE slug = $1';
    if (excludeId) {
      values.push(excludeId);
      query += ` AND id <> $${values.length}`;
    }
    query += ' LIMIT 1';
    const { rows } = await executor.query(query, values);
    return Boolean(rows[0]);
  }

  async existsBySku(sku, excludeId, executor = this.db) {
    const values = [sku];
    let query = 'SELECT id FROM products WHERE sku = $1';
    if (excludeId) {
      values.push(excludeId);
      query += ` AND id <> $${values.length}`;
    }
    query += ' LIMIT 1';
    const { rows } = await executor.query(query, values);
    return Boolean(rows[0]);
  }

  async categoryExists(categoryId, executor = this.db) {
    const { rows } = await executor.query(
      'SELECT id FROM categories WHERE id = $1 LIMIT 1',
      [categoryId]
    );
    return Boolean(rows[0]);
  }

  async create(payload, executor = this.db) {
    const columns = PRODUCT_COLUMNS.filter((key) => payload[key] !== undefined);
    const values = columns.map((key) => payload[key]);
    const placeholders = values.map((_, idx) => `$${idx + 1}`);

    const query = `
      INSERT INTO products (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING id
    `;

    const { rows } = await executor.query(query, values);
    return rows[0];
  }

  async findById(id, executor = this.db) {
    const query = `
      SELECT
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'upload_url', pi.image_url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary,
              'sort_order', pi.sort_order,
              'created_at', pi.created_at
            )
            ORDER BY pi.sort_order ASC, pi.id ASC
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) AS images,
        COALESCE(review_stats.average_rating, 0) AS rating,
        COALESCE(review_stats.total_reviews, 0) AS "reviewsCount",
        COALESCE(review_stats.average_rating, 0) AS average_rating,
        COALESCE(review_stats.total_reviews, 0) AS total_reviews
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      LEFT JOIN LATERAL (
        SELECT
          ROUND(AVG(pr.rating)::numeric, 2) AS average_rating,
          COUNT(*)::int AS total_reviews
        FROM product_reviews pr
        WHERE pr.product_id = p.id
      ) review_stats ON TRUE
      WHERE p.id = $1
      GROUP BY p.id, review_stats.average_rating, review_stats.total_reviews
      LIMIT 1
    `;

    const { rows } = await executor.query(query, [id]);
    return rows[0] || null;
  }

  async findPublicBySlug(slug, executor = this.db) {
    const query = `
      SELECT
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'upload_url', pi.image_url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary,
              'sort_order', pi.sort_order,
              'created_at', pi.created_at
            )
            ORDER BY pi.sort_order ASC, pi.id ASC
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) AS images,
        COALESCE(review_stats.average_rating, 0) AS rating,
        COALESCE(review_stats.total_reviews, 0) AS "reviewsCount",
        COALESCE(review_stats.average_rating, 0) AS average_rating,
        COALESCE(review_stats.total_reviews, 0) AS total_reviews
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_images pi ON pi.product_id = p.id
      LEFT JOIN LATERAL (
        SELECT
          ROUND(AVG(pr.rating)::numeric, 2) AS average_rating,
          COUNT(*)::int AS total_reviews
        FROM product_reviews pr
        WHERE pr.product_id = p.id
      ) review_stats ON TRUE
      WHERE p.slug = $1
        AND p.status = 'active'
        AND c.is_active = TRUE
      GROUP BY p.id, review_stats.average_rating, review_stats.total_reviews
      LIMIT 1
    `;

    const { rows } = await executor.query(query, [slug]);
    return rows[0] || null;
  }

  async updateById(id, payload, executor = this.db) {
    const keys = PRODUCT_COLUMNS.filter((key) => payload[key] !== undefined);
    if (!keys.length) return this.findById(id, executor);

    const values = keys.map((key) => payload[key]);
    const sets = keys.map((key, idx) => `${key} = $${idx + 1}`);
    values.push(id);
    sets.push('updated_at = NOW()');

    const query = `
      UPDATE products
      SET ${sets.join(', ')}
      WHERE id = $${values.length}
      RETURNING id
    `;

    const { rows } = await executor.query(query, values);
    return rows[0] || null;
  }

 async deleteById(id, executor = this.db) {
  const { rows } = await executor.query(
    `
      UPDATE products
      SET status = 'inactive', updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [id]
  );

  return Boolean(rows[0]);
}

  buildWhereClause(filters, isPublic = false) {
    const where = [];
    const values = [];

    const push = (condition, value) => {
      values.push(value);
      where.push(`${condition} $${values.length}`);
    };

    if (isPublic) {
      where.push(`p.status = 'active'`);
      where.push(`c.is_active = TRUE`);
    } else if (filters.status) {
      push('p.status =', filters.status);
    }

   if (filters.search) {
  values.push(`%${filters.search}%`);
  where.push(`(
    p.name ILIKE $${values.length}
    OR p.slug ILIKE $${values.length}
    OR p.sku ILIKE $${values.length}
    OR COALESCE(p.short_description, '') ILIKE $${values.length}
    OR COALESCE(p.description, '') ILIKE $${values.length}
    OR COALESCE(p.fabric, '') ILIKE $${values.length}
    OR COALESCE(p.occasion, '') ILIKE $${values.length}
    OR COALESCE(p.color, '') ILIKE $${values.length}
  )`);
}

    if (filters.category_id) push('p.category_id =', filters.category_id);
    if (filters.fabric) push('p.fabric =', filters.fabric);
    if (filters.occasion) push('p.occasion =', filters.occasion);
    if (filters.color) push('p.color =', filters.color);
    if (filters.is_new_arrival !== undefined) push('p.is_new_arrival =', filters.is_new_arrival);
    if (filters.min_price !== undefined) push('p.selling_price >=', filters.min_price);
    if (filters.max_price !== undefined) push('p.selling_price <=', filters.max_price);
    if (filters.in_stock === true) where.push('p.stock > 0');
    if (filters.in_stock === false) where.push('p.stock = 0');

    return {
      whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
      values,
    };
  }

  async list(filters = {}, isPublic = false, executor = this.db) {
    const { page, limit, offset } = parsePagination(filters, { page: 1, limit: 20, maxLimit: 100 });
    const sortBy = ALLOWED_SORT_COLUMNS.has(filters.sort_by) ? filters.sort_by : 'created_at';
    const sortOrder = (filters.sort_order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { whereSql, values } = this.buildWhereClause(filters, isPublic);

    const categoryJoin = isPublic ? 'JOIN categories c ON c.id = p.category_id' : '';
    const countQuery = `SELECT COUNT(*)::int AS total FROM products p ${categoryJoin} ${whereSql}`;
    const countResult = await executor.query(countQuery, values);
    const total = countResult.rows[0]?.total || 0;

    const listValues = [...values, limit, offset];
    const dataQuery = `
      SELECT
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'upload_url', pi.image_url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary,
              'sort_order', pi.sort_order,
              'created_at', pi.created_at
            )
            ORDER BY pi.sort_order ASC, pi.id ASC
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) AS images,
        COALESCE(review_stats.average_rating, 0) AS rating,
        COALESCE(review_stats.total_reviews, 0) AS "reviewsCount",
        COALESCE(review_stats.average_rating, 0) AS average_rating,
        COALESCE(review_stats.total_reviews, 0) AS total_reviews
      FROM products p
      ${categoryJoin}
      LEFT JOIN product_images pi ON pi.product_id = p.id
      LEFT JOIN LATERAL (
        SELECT
          ROUND(AVG(pr.rating)::numeric, 2) AS average_rating,
          COUNT(*)::int AS total_reviews
        FROM product_reviews pr
        WHERE pr.product_id = p.id
      ) review_stats ON TRUE
      ${whereSql}
      GROUP BY p.id, review_stats.average_rating, review_stats.total_reviews
      ORDER BY p.${sortBy} ${sortOrder}, p.id DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const listResult = await executor.query(dataQuery, listValues);
    return {
      items: listResult.rows,
      meta: buildPaginationMeta({ page, limit, total }),
    };
  }

  async replaceImages(productId, images, executor = this.db) {
    await executor.query('DELETE FROM product_images WHERE product_id = $1', [productId]);
    if (!images || !images.length) return;

    const requestedPrimaryIndex = images.findIndex((img) => Boolean(img.is_primary));
    const primaryIndex = requestedPrimaryIndex >= 0 ? requestedPrimaryIndex : 0;

    const valueParts = [];
    const values = [];
    images.forEach((img, idx) => {
      const base = idx * 5;
      valueParts.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
      values.push(
        productId,
        img.image_url,
        img.alt_text ?? null,
        idx === primaryIndex,
        img.sort_order ?? idx
      );
    });

    const query = `
      INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
      VALUES ${valueParts.join(', ')}
    `;
    await executor.query(query, values);
  }

  async listImagesByProductId(productId, executor = this.db) {
    const query = `
      SELECT id, product_id, image_url, image_url AS upload_url, alt_text, sort_order, is_primary, created_at
      FROM product_images
      WHERE product_id = $1
      ORDER BY sort_order ASC, id ASC
    `;
    const { rows } = await executor.query(query, [productId]);
    return rows;
  }

  async findImageById(productId, imageId, executor = this.db) {
    const query = `
      SELECT id, product_id, image_url, image_url AS upload_url, alt_text, sort_order, is_primary, created_at
      FROM product_images
      WHERE product_id = $1 AND id = $2
      LIMIT 1
    `;
    const { rows } = await executor.query(query, [productId, imageId]);
    return rows[0] || null;
  }

  async ensureSinglePrimary(productId, primaryImageId, executor = this.db) {
    await executor.query(
      'UPDATE product_images SET is_primary = FALSE WHERE product_id = $1 AND id <> $2',
      [productId, primaryImageId]
    );
    await executor.query(
      'UPDATE product_images SET is_primary = TRUE WHERE product_id = $1 AND id = $2',
      [productId, primaryImageId]
    );
  }

  async ensureAnyPrimary(productId, executor = this.db) {
    const { rows } = await executor.query(
      'SELECT id FROM product_images WHERE product_id = $1 AND is_primary = TRUE LIMIT 1',
      [productId]
    );
    if (rows[0]) return;

    const fallback = await executor.query(
      'SELECT id FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC, id ASC LIMIT 1',
      [productId]
    );
    if (!fallback.rows[0]) return;
    await executor.query('UPDATE product_images SET is_primary = TRUE WHERE id = $1', [fallback.rows[0].id]);
  }

  async createImage(productId, payload, executor = this.db) {
    const query = `
      INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, product_id, image_url, image_url AS upload_url, alt_text, sort_order, is_primary, created_at
    `;
    const values = [
      productId,
      payload.image_url,
      payload.alt_text ?? null,
      payload.sort_order ?? 0,
      Boolean(payload.is_primary),
    ];
    const { rows } = await executor.query(query, values);
    const created = rows[0];

    if (created.is_primary) {
      await this.ensureSinglePrimary(productId, created.id, executor);
    } else {
      await this.ensureAnyPrimary(productId, executor);
    }

    return this.findImageById(productId, created.id, executor);
  }

  async updateImage(productId, imageId, payload, executor = this.db) {
    const allowed = ['image_url', 'alt_text', 'sort_order', 'is_primary'];
    const keys = allowed.filter((key) => payload[key] !== undefined);
    const values = [];
    const sets = [];

    keys.forEach((key, idx) => {
      sets.push(`${key} = $${idx + 1}`);
      values.push(payload[key]);
    });

    if (sets.length) {
      values.push(productId, imageId);
      const query = `
        UPDATE product_images
        SET ${sets.join(', ')}
        WHERE product_id = $${values.length - 1} AND id = $${values.length}
      `;
      await executor.query(query, values);
    }

    if (payload.is_primary === true) {
      await this.ensureSinglePrimary(productId, imageId, executor);
    } else {
      await this.ensureAnyPrimary(productId, executor);
    }

    return this.findImageById(productId, imageId, executor);
  }

  async deleteImage(productId, imageId, executor = this.db) {
    const existing = await this.findImageById(productId, imageId, executor);
    if (!existing) return false;

    const { rowCount } = await executor.query(
      'DELETE FROM product_images WHERE product_id = $1 AND id = $2',
      [productId, imageId]
    );
    await this.ensureAnyPrimary(productId, executor);
    return rowCount > 0;
  }

  async searchSuggestions({ q, limit = 8, isPublic = true }, executor = this.db) {
    const searchValue = `%${q}%`;
    const prefixValue = `${q}%`;
    const values = [searchValue, prefixValue];
    const where = [];

    if (isPublic) {
      where.push(`p.status = 'active'`);
      where.push(`c.is_active = TRUE`);
    }

   where.push(`(
  p.name ILIKE $1
  OR p.slug ILIKE $1
  OR p.sku ILIKE $1
  OR COALESCE(p.fabric, '') ILIKE $1
  OR COALESCE(p.occasion, '') ILIKE $1
  OR COALESCE(p.color, '') ILIKE $1
)`);


    const query = `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.sku,
        p.selling_price,
        p.mrp,
        p.stock,
        pi.image_url
      FROM products p
      ${isPublic ? 'JOIN categories c ON c.id = p.category_id' : ''}
      LEFT JOIN product_images pi
        ON pi.product_id = p.id
        AND pi.is_primary = TRUE
      WHERE ${where.join(' AND ')}
      ORDER BY
        CASE
          WHEN p.name ILIKE $2 THEN 1
          WHEN p.slug ILIKE $2 THEN 2
          WHEN p.sku ILIKE $2 THEN 3
          ELSE 4
        END,
        p.created_at DESC
      LIMIT $${values.length + 1}
    `;

    const { rows } = await executor.query(query, [...values, limit]);
    return rows;
  }

  async getPublicFilters(filters = {}, executor = this.db) {
    const conditions = [`p.status = 'active'`, `c.is_active = TRUE`];
    const values = [];

    if (filters.category_id) {
      values.push(filters.category_id);
      conditions.push(`p.category_id = $${values.length}`);
    }

    if (filters.occasion) {
      values.push(filters.occasion);
      conditions.push(`p.occasion = $${values.length}`);
    }

    const whereSql = `WHERE ${conditions.join(' AND ')}`;
    const query = `
      SELECT
        COALESCE(array_remove(array_agg(DISTINCT c.name), NULL), '{}') AS categories,
        COALESCE(array_remove(array_agg(DISTINCT p.fabric), NULL), '{}') AS fabrics,
        COALESCE(array_remove(array_agg(DISTINCT p.occasion), NULL), '{}') AS occasions,
        COALESCE(
          array_agg(DISTINCT INITCAP(LOWER(TRIM(p.color))) ORDER BY INITCAP(LOWER(TRIM(p.color))))
            FILTER (WHERE NULLIF(TRIM(p.color), '') IS NOT NULL),
          '{}'
        ) AS colors,
        COALESCE(MIN(p.selling_price), 0) AS min_price,
        COALESCE(MAX(p.selling_price), 0) AS max_price
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ${whereSql}
    `;

    const { rows } = await executor.query(query, values);
    return rows[0] || {
      categories: [],
      fabrics: [],
      occasions: [],
      colors: [],
      min_price: 0,
      max_price: 0,
    };
  }
}

module.exports = ProductModel;
