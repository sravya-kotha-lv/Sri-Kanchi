let db;

try {
  db = require("../config/db");
} catch (error) {
  db = require("../db/postgres");
}

const runQuery = async (text, params = []) => {
  if (typeof db.query === "function") {
    return db.query(text, params);
  }

  if (db.pool && typeof db.pool.query === "function") {
    return db.pool.query(text, params);
  }

  if (db.sequelize && typeof db.sequelize.query === "function") {
    const [rows] = await db.sequelize.query(text, {
      bind: params,
    });

    return { rows };
  }

  throw new Error("Database client is not configured correctly");
};

const normalizeCategory = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const normalizedNameExpression = `
  LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(name, '[''’]', '', 'g'), '[^a-zA-Z0-9]+', ' ', 'g'), '\\s+', ' ', 'g')))
`;

const createCategory = async (payload) => {
  const query = `
    INSERT INTO categories (name, slug, description, image_url, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING id, name, slug, description, image_url, is_active, created_at, updated_at
  `;

  const values = [
    payload.name,
    payload.slug,
    payload.description || null,
    payload.image_url || null,
    payload.is_active,
  ];

  const { rows } = await runQuery(query, values);
  return normalizeCategory(rows[0]);
};

const findCategoryById = async (id) => {
  const query = `
    SELECT id, name, slug, description, image_url, is_active, created_at, updated_at
    FROM categories
    WHERE id = $1
    LIMIT 1
  `;
  const { rows } = await runQuery(query, [id]);
  return normalizeCategory(rows[0]);
};

const findCategoryBySlug = async (slug) => {
  const query = `
    SELECT id, name, slug, description, image_url, is_active, created_at, updated_at
    FROM categories
    WHERE slug = $1
    LIMIT 1
  `;
  const { rows } = await runQuery(query, [slug]);
  return normalizeCategory(rows[0]);
};

const countProductsByCategoryId = async (categoryId) => {
  const query = `
    SELECT COUNT(*)::int AS total
    FROM products
    WHERE category_id = $1
  `;
  const { rows } = await runQuery(query, [categoryId]);
  return rows[0]?.total || 0;
};

const checkCategorySlugExists = async (slug, excludeId = null) => {
  const values = [slug];
  let query = `
    SELECT id
    FROM categories
    WHERE slug = $1
  `;

  if (excludeId) {
    values.push(excludeId);
    query += " AND id <> $2";
  }

  query += " LIMIT 1";

  const { rows } = await runQuery(query, values);
  return Boolean(rows[0]);
};

const checkCategoryNameExists = async (normalizedName, excludeId = null) => {
  const values = [normalizedName];
  let query = `
    SELECT id
    FROM categories
    WHERE ${normalizedNameExpression} = $1
  `;

  if (excludeId) {
    values.push(excludeId);
    query += " AND id <> $2";
  }

  query += " LIMIT 1";

  const { rows } = await runQuery(query, values);
  return Boolean(rows[0]);
};

const listCategories = async ({ filters, pagination, includeInactive = true }) => {
  const values = [];
  const whereParts = [];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    whereParts.push(`(name ILIKE $${values.length} OR slug ILIKE $${values.length})`);
  }

  if (typeof filters.is_active !== "undefined") {
    values.push(filters.is_active);
    whereParts.push(`is_active = $${values.length}`);
  } else if (!includeInactive) {
    whereParts.push("is_active = TRUE");
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  values.push(pagination.limit);
  values.push(pagination.offset);

  const listQuery = `
    SELECT id, name, slug, description, image_url, is_active, created_at, updated_at
    FROM categories
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
  `;

  const countValues = values.slice(0, values.length - 2);
  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM categories
    ${whereClause}
  `;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    runQuery(listQuery, values),
    runQuery(countQuery, countValues),
  ]);

  return {
    categories: rows.map(normalizeCategory),
    total: countRows[0]?.total || 0,
  };
};

const updateCategory = async (id, payload) => {
  const fields = [];
  const values = [];

  Object.entries(payload).forEach(([key, value]) => {
    fields.push(`${key} = $${fields.length + 1}`);
    values.push(value);
  });

  values.push(id);

  const query = `
    UPDATE categories
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE id = $${values.length}
    RETURNING id, name, slug, description, image_url, is_active, created_at, updated_at
  `;

  const { rows } = await runQuery(query, values);
  return normalizeCategory(rows[0]);
};

const softDeleteCategory = async (id) => {
  const query = `
    UPDATE categories
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = $1
    RETURNING id, name, slug, description, image_url, is_active, created_at, updated_at
  `;
  const { rows } = await runQuery(query, [id]);
  return normalizeCategory(rows[0]);
};

const permanentlyDeleteCategory = async (id) => {
  const query = `
    DELETE FROM categories
    WHERE id = $1
    RETURNING id, name, slug, description, image_url, is_active, created_at, updated_at
  `;

  const { rows } = await runQuery(query, [id]);
  return normalizeCategory(rows[0]);
};

const deactivateProductsByCategoryId = async (categoryId) => {
  const query = `
    UPDATE products
    SET status = 'draft', updated_at = NOW()
    WHERE category_id = $1
  `;

  await runQuery(query, [categoryId]);
};

module.exports = {
  createCategory,
  findCategoryById,
  findCategoryBySlug,
  countProductsByCategoryId,
  checkCategorySlugExists,
  checkCategoryNameExists,
  listCategories,
  updateCategory,
  softDeleteCategory,
  permanentlyDeleteCategory,
  deactivateProductsByCategoryId,
};
