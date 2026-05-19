class DashboardModel {
  constructor(db) {
    this.db = db;
  }

  getPublicProductSelectClause() {
    return `
      p.id,
      p.name,
      p.slug,
      p.sku,
      p.short_description,
      p.fabric,
      p.occasion,
      p.color,
      p.mrp,
      p.selling_price,
      p.stock,
      p.is_new_arrival,
      p.updated_at,
      COALESCE(c.id, p.category_id) AS category_id,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      COALESCE(
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ),
        NULL
      ) AS primary_image,
      COALESCE(discount.discount_title, NULL) AS discount_title,
      COALESCE(discount.discount_code, NULL) AS discount_code,
      COALESCE(discount.discount_type, NULL) AS discount_type,
      COALESCE(discount.discount_value, 0) AS discount_value,
      COALESCE(discount.discount_amount, 0) AS discount_amount,
      GREATEST(p.selling_price - COALESCE(discount.discount_amount, 0), 0) AS final_price,
      COALESCE(review_stats.average_rating, 0) AS rating,
      COALESCE(review_stats.total_reviews, 0) AS "reviewsCount",
      COALESCE(review_stats.average_rating, 0) AS average_rating,
      COALESCE(review_stats.total_reviews, 0) AS total_reviews
    `;
  }

  getPublicProductBaseQuery(orderBySql) {
    return `
      SELECT
        ${this.getPublicProductSelectClause()}
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT
          d.title AS discount_title,
          d.code AS discount_code,
          d.type AS discount_type,
          d.value AS discount_value,
          CASE
            WHEN d.type = 'percentage' THEN LEAST(
              ROUND((p.selling_price * d.value) / 100.0, 2),
              COALESCE(d.max_discount_amount, ROUND((p.selling_price * d.value) / 100.0, 2))
            )
            WHEN d.type = 'fixed' THEN LEAST(
              d.value,
              COALESCE(d.max_discount_amount, d.value),
              p.selling_price
            )
            ELSE 0
          END AS discount_amount
        FROM discounts d
        WHERE d.is_active = TRUE
          AND NOW() BETWEEN d.starts_at AND d.ends_at
          AND (
            d.applies_to = 'all'
            OR (d.applies_to = 'product' AND d.product_id = p.id)
            OR (d.applies_to = 'category' AND d.category_id = p.category_id)
          )
        ORDER BY
          CASE
            WHEN d.type = 'percentage' THEN LEAST(
              ROUND((p.selling_price * d.value) / 100.0, 2),
              COALESCE(d.max_discount_amount, ROUND((p.selling_price * d.value) / 100.0, 2))
            )
            WHEN d.type = 'fixed' THEN LEAST(
              d.value,
              COALESCE(d.max_discount_amount, d.value),
              p.selling_price
            )
            ELSE 0
          END DESC,
          d.ends_at ASC
        LIMIT 1
      ) discount ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          ROUND(AVG(pr.rating)::numeric, 2) AS average_rating,
          COUNT(*)::int AS total_reviews
        FROM product_reviews pr
        WHERE pr.product_id = p.id
      ) review_stats ON TRUE
      WHERE p.status = 'active'
        AND p.stock > 0
      ${orderBySql}
    `;
  }

  async getSummary(executor = this.db) {
    const query = `
      WITH product_stats AS (
        SELECT
          COUNT(*)::int AS total_products,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active_products,
          COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive_products,
          COUNT(*) FILTER (WHERE is_new_arrival = TRUE)::int AS new_arrival_products,
          COUNT(DISTINCT category_id)::int AS category_count
        FROM products
      ),
      discount_stats AS (
        SELECT
          COUNT(*) FILTER (
            WHERE is_active = TRUE
              AND NOW() BETWEEN starts_at AND ends_at
          )::int AS active_discounts
        FROM discounts
      ),
      inventory_stats AS (
        SELECT
          COUNT(*) FILTER (
            WHERE available_stock <= low_stock_threshold
              AND available_stock > 0
          )::int AS low_stock_count
        FROM inventory
      )
      SELECT
        p.total_products,
        p.active_products,
        p.inactive_products,
        p.new_arrival_products,
        p.category_count,
        d.active_discounts,
        i.low_stock_count
      FROM product_stats p
      CROSS JOIN discount_stats d
      CROSS JOIN inventory_stats i
    `;

    const { rows } = await executor.query(query);
    return rows[0] || {
      total_products: 0,
      active_products: 0,
      inactive_products: 0,
      new_arrival_products: 0,
      category_count: 0,
      active_discounts: 0,
      low_stock_count: 0,
    };
  }

  async getTopProducts(limit = 10, executor = this.db) {
    const query = `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.sku,
        p.selling_price,
        p.stock,
        p.is_new_arrival,
        p.status,
        p.updated_at,
        COALESCE(
          (
            SELECT pi.image_url
            FROM product_images pi
            WHERE pi.product_id = p.id
            ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
            LIMIT 1
          ),
          NULL
        ) AS primary_image
      FROM products p
      WHERE p.status = 'active'
      ORDER BY
        p.is_new_arrival DESC,
        p.stock DESC,
        p.updated_at DESC
      LIMIT $1
    `;

    const { rows } = await executor.query(query, [limit]);
    return rows;
  }

  async getLowStockProducts(limit = 20, executor = this.db) {
    const query = `
      SELECT
        i.product_id,
        p.name,
        p.slug,
        p.sku,
        i.available_stock,
        i.reserved_stock,
        i.low_stock_threshold,
        i.stock_status,
        i.updated_at
      FROM inventory i
      LEFT JOIN products p ON p.id = i.product_id
      WHERE i.available_stock <= i.low_stock_threshold
        AND i.available_stock > 0
      ORDER BY
        (i.low_stock_threshold - i.available_stock) DESC,
        i.updated_at ASC
      LIMIT $1
    `;
    const { rows } = await executor.query(query, [limit]);
    return rows;
  }

  async getCategorySummary(limit = 20, executor = this.db) {
    const query = `
      SELECT
        p.category_id,
        COALESCE(c.name, 'Uncategorized') AS category_name,
        COUNT(p.id)::int AS total_products,
        COUNT(p.id) FILTER (WHERE p.status = 'active')::int AS active_products,
        COUNT(p.id) FILTER (WHERE p.status = 'inactive')::int AS inactive_products,
        COUNT(p.id) FILTER (WHERE p.is_new_arrival = TRUE)::int AS new_arrival_products,
        COALESCE(SUM(p.stock), 0)::int AS total_stock
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      GROUP BY p.category_id, c.name
      ORDER BY total_products DESC, category_name ASC
      LIMIT $1
    `;
    const { rows } = await executor.query(query, [limit]);
    return rows;
  }

  async getPublicSummary(executor = this.db) {
    const query = `
      WITH product_stats AS (
        SELECT
          COUNT(*) FILTER (WHERE status = 'active')::int AS total_products,
          COUNT(*) FILTER (WHERE status = 'active' AND stock > 0)::int AS in_stock_products,
          COUNT(*) FILTER (WHERE status = 'active' AND is_new_arrival = TRUE)::int AS new_arrivals
        FROM products
      ),
      category_stats AS (
        SELECT COUNT(*) FILTER (WHERE is_active = TRUE)::int AS total_categories
        FROM categories
      ),
      discount_stats AS (
        SELECT COUNT(*) FILTER (
          WHERE is_active = TRUE
            AND NOW() BETWEEN starts_at AND ends_at
        )::int AS active_offers
        FROM discounts
      )
      SELECT
        p.total_products,
        p.in_stock_products,
        p.new_arrivals,
        c.total_categories,
        d.active_offers
      FROM product_stats p
      CROSS JOIN category_stats c
      CROSS JOIN discount_stats d
    `;

    const { rows } = await executor.query(query);
    return rows[0] || {
      total_products: 0,
      in_stock_products: 0,
      new_arrivals: 0,
      total_categories: 0,
      active_offers: 0,
    };
  }

  async getPublicHeroBanners(limit = 5, executor = this.db) {
    const query = `
      ${this.getPublicProductBaseQuery(`
      ORDER BY
        p.is_new_arrival DESC,
        COALESCE(discount.discount_amount, 0) DESC,
        p.updated_at DESC
      LIMIT $1
    `)}
    `;

    const { rows } = await executor.query(query, [limit]);
    return rows;
  }

  async getPublicFeaturedCategories(limit = 8, executor = this.db) {
    const query = `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        c.image_url,
        COUNT(p.id)::int AS product_count,
        MIN(p.selling_price) FILTER (WHERE p.status = 'active') AS starting_price,
        COALESCE(
          c.image_url,
          (
            SELECT pi.image_url
            FROM products cp
            LEFT JOIN product_images pi ON pi.product_id = cp.id
            WHERE cp.category_id = c.id
              AND cp.status = 'active'
              AND pi.id IS NOT NULL
            ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
            LIMIT 1
          )
        ) AS preview_image
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.status = 'active'
      WHERE c.is_active = TRUE
      GROUP BY c.id
      HAVING COUNT(p.id) > 0
      ORDER BY product_count DESC, c.name ASC
      LIMIT $1
    `;

    const { rows } = await executor.query(query, [limit]);
    return rows.map((row) => ({
      ...row,
      product_count: Number(row.product_count || 0),
      starting_price: Number(row.starting_price || 0),
    }));
  }

  async getPublicTopDeals(limit = 10, executor = this.db) {
    const query = `
      ${this.getPublicProductBaseQuery(`
      ORDER BY
        COALESCE(discount.discount_amount, 0) DESC,
        p.is_new_arrival DESC,
        p.updated_at DESC
      LIMIT $1
    `)}
    `;

    const { rows } = await executor.query(query, [limit]);
    return rows;
  }

  async getPublicTrendingProducts(limit = 12, executor = this.db) {
    const query = `
      ${this.getPublicProductBaseQuery(`
      ORDER BY
        p.is_new_arrival DESC,
        p.stock DESC,
        p.updated_at DESC
      LIMIT $1
    `)}
    `;

    const { rows } = await executor.query(query, [limit]);
    return rows;
  }
}

module.exports = DashboardModel;
