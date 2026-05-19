const AppError = require("../common/errors/app-error");
const { parsePagination, buildPaginationMeta } = require("../common/utils/pagination");
const categoryModel = require("./category.model");

const normalizeCategoryName = (name) =>
  String(name || "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const buildCategorySlug = (name) =>
  normalizeCategoryName(name)
    .replace(/\s+/g, "-")
    .slice(0, 150);

const buildUniqueCategorySlug = async (name, excludeId = null) => {
  const baseSlug = buildCategorySlug(name);

  if (!baseSlug) {
    throw new AppError("Category name must contain valid slug characters", 400, "INVALID_CATEGORY_NAME");
  }

  let slug = baseSlug;
  let suffix = 1;

  while (await categoryModel.checkCategorySlugExists(slug, excludeId)) {
    const suffixText = `-${suffix}`;
    slug = `${baseSlug.slice(0, 150 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  return slug;
};

const sanitizeCategoryPayload = (payload) => {
  const sanitized = { ...payload };

  if (Object.prototype.hasOwnProperty.call(sanitized, "description") && sanitized.description === "") {
    sanitized.description = null;
  }

  if (Object.prototype.hasOwnProperty.call(sanitized, "image_url") && sanitized.image_url === "") {
    sanitized.image_url = null;
  }

  return sanitized;
};

const createCategory = async (payload) => {
  const sanitizedPayload = sanitizeCategoryPayload(payload);

  const normalizedName = normalizeCategoryName(sanitizedPayload.name);
  const nameExists = await categoryModel.checkCategoryNameExists(normalizedName);
  if (nameExists) {
    throw new AppError("Category name already exists", 409, "CATEGORY_NAME_EXISTS");
  }

  sanitizedPayload.slug = await buildUniqueCategorySlug(sanitizedPayload.name);

  return categoryModel.createCategory(sanitizedPayload);
};

const listAdminCategories = async (query) => {
  const pagination = parsePagination(query, { page: 1, limit: 10, maxLimit: 100 });
  const filters = {
    search: query.search,
    is_active: query.is_active,
  };

  const result = await categoryModel.listCategories({
    filters,
    pagination,
    includeInactive: true,
  });

  return {
    categories: result.categories,
    meta: buildPaginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
    }),
  };
};

const listPublicCategories = async (query) => {
  const pagination = parsePagination(query, { page: 1, limit: 10, maxLimit: 100 });
  const filters = {
    search: query.search,
    is_active: true,
  };

  const result = await categoryModel.listCategories({
    filters,
    pagination,
    includeInactive: false,
  });

  return {
    categories: result.categories,
    meta: buildPaginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
    }),
  };
};

const getCategoryById = async (id) => {
  const category = await categoryModel.findCategoryById(id);

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  return category;
};

const getCategoryBySlug = async (slug) => {
  const category = await categoryModel.findCategoryBySlug(slug);

  if (!category || !category.isActive) {
    throw new AppError("Category not found", 404);
  }

  return category;
};

const updateCategory = async (id, payload) => {
  const existingCategory = await categoryModel.findCategoryById(id);

  if (!existingCategory) {
    throw new AppError("Category not found", 404);
  }

  const sanitizedPayload = sanitizeCategoryPayload(payload);

  if (sanitizedPayload.name) {
    const normalizedName = normalizeCategoryName(sanitizedPayload.name);
    const nameExists = await categoryModel.checkCategoryNameExists(normalizedName, id);
    if (nameExists) {
      throw new AppError("Category name already exists", 409, "CATEGORY_NAME_EXISTS");
    }

    sanitizedPayload.slug = await buildUniqueCategorySlug(sanitizedPayload.name, id);
  }

  const updatedCategory = await categoryModel.updateCategory(id, sanitizedPayload);
  return updatedCategory;
};

const deleteCategory = async (id) => {
  const existingCategory = await categoryModel.findCategoryById(id);

  if (!existingCategory) {
    throw new AppError("Category not found", 404);
  }

  await categoryModel.deactivateProductsByCategoryId(id);

  return categoryModel.softDeleteCategory(id);
};

const permanentlyDeleteCategory = async (id) => {
  const existingCategory = await categoryModel.findCategoryById(id);

  if (!existingCategory) {
    throw new AppError("Category not found", 404);
  }

  await categoryModel.deactivateProductsByCategoryId(id);

  return categoryModel.permanentlyDeleteCategory(id);
};

module.exports = {
  createCategory,
  listAdminCategories,
  listPublicCategories,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  permanentlyDeleteCategory,
};
