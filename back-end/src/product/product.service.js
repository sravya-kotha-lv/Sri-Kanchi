const AppError = require('../common/errors/app-error');
const TransactionalService = require('../common/services/transactional-service');
const { validateRange } = require('../common/utils/validation');
const { INVENTORY_STATUS } = require('../common/constants');

const normalizeProductSlugSource = (name) =>
  String(name || '')
    .toLowerCase()
    .trim()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const buildProductSlug = (name) =>
  normalizeProductSlugSource(name)
    .replace(/\s+/g, '-')
    .slice(0, 150);

const normalizeProductNameForStorage = (name) =>
  String(name || '')
    .trim()
    .replace(/\s+/g, ' ');

class ProductService extends TransactionalService {
  constructor({ model, inventoryModel, db }) {
  super(db);
  this.model = model;
  this.inventoryModel = inventoryModel;
  this.db = db;
}

    calculateInventoryStatus(availableStock, lowStockThreshold = 5) {
    if (availableStock <= 0) return INVENTORY_STATUS.OUT_OF_STOCK;
    if (availableStock <= lowStockThreshold) return INVENTORY_STATUS.LOW_STOCK;
    return INVENTORY_STATUS.IN_STOCK;
  }

  async syncInventoryForProduct(productId, stock, executor) {
    if (!this.inventoryModel) return;

    const availableStock = Number(stock || 0);
    const existingInventory = await this.inventoryModel.findByProductId(productId, executor);

    const reservedStock = existingInventory
      ? Math.min(Number(existingInventory.reserved_stock || 0), availableStock)
      : 0;

    const lowStockThreshold = existingInventory
      ? Number(existingInventory.low_stock_threshold || 5)
      : 5;

    await this.inventoryModel.upsertByProductId(
      {
        product_id: productId,
        available_stock: availableStock,
        reserved_stock: reservedStock,
        low_stock_threshold: lowStockThreshold,
        stock_status: this.calculateInventoryStatus(availableStock, lowStockThreshold),
      },
      executor
    );
  }

  normalizeImagePayload(image) {
    if (!image) return image;

    const normalized = { ...image };
    if (normalized.upload_url && normalized.image_url === undefined) {
      normalized.image_url = normalized.upload_url;
    }
    delete normalized.upload_url;
    return normalized;
  }

  normalizeProductPayload(payload) {
    if (!payload) return payload;

    const normalized = { ...payload };
    if (normalized.name !== undefined) {
      normalized.name = normalizeProductNameForStorage(normalized.name);
    }
    if (Array.isArray(normalized.images)) {
      normalized.images = normalized.images.map((image) => this.normalizeImagePayload(image));
    }
    return normalized;
  }

  async assertUniqueFields({ slug, sku, excludeId, executor }) {
    if (slug) {
      const slugTaken = await this.model.existsBySlug(slug, excludeId, executor);
      if (slugTaken) throw new AppError('Slug already exists', 409, 'DUPLICATE_SLUG');
    }

    if (sku) {
      const skuTaken = await this.model.existsBySku(sku, excludeId, executor);
      if (skuTaken) throw new AppError('SKU already exists', 409, 'DUPLICATE_SKU');
    }
  }

  async assertCategoryExists(categoryId, executor) {
    if (categoryId === undefined || categoryId === null) return;

    const exists = await this.model.categoryExists(categoryId, executor);
    if (!exists) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }
  }

  async buildUniqueProductSlug(name, excludeId = null, executor = this.db) {
    const baseSlug = buildProductSlug(name);

    if (!baseSlug) {
      throw new AppError('Product name must contain valid slug characters', 400, 'INVALID_PRODUCT_NAME');
    }

    let slug = baseSlug;
    let suffix = 1;

    while (await this.model.existsBySlug(slug, excludeId, executor)) {
      const suffixText = `-${suffix}`;
      slug = `${baseSlug.slice(0, 150 - suffixText.length)}${suffixText}`;
      suffix += 1;
    }

    return slug;
  }

  async create(payload) {
    const normalizedPayload = this.normalizeProductPayload(payload);
    return this.withTransaction(async (executor) => {
      if (normalizedPayload.selling_price > normalizedPayload.mrp) {
        throw new AppError('Selling price cannot be greater than MRP', 400, 'INVALID_PRICE');
      }

      normalizedPayload.slug = await this.buildUniqueProductSlug(normalizedPayload.name, null, executor);

      await this.assertUniqueFields({
        sku: normalizedPayload.sku,
        executor,
      });
      await this.assertCategoryExists(normalizedPayload.category_id, executor);

      const { images = [], ...productData } = normalizedPayload;
     const created = await this.model.create(productData, executor);

await this.syncInventoryForProduct(created.id, productData.stock, executor);

if (images.length) {
  await this.model.replaceImages(created.id, images, executor);
}

return this.model.findById(created.id, executor);

    });
  }

  async listAdmin(query) {
    validateRange({
      min: query.min_price,
      max: query.max_price,
      minLabel: 'min_price',
      maxLabel: 'max_price',
    });

    const filters = {
      page: query.page,
      limit: query.limit,
      search: query.search,
      category_id: query.category_id,
      fabric: query.fabric,
      occasion: query.occasion,
      color: query.color,
      status: query.status,
      is_new_arrival: query.is_new_arrival,
      min_price: query.min_price,
      max_price: query.max_price,
      in_stock: query.in_stock,
      sort_by: query.sort_by,
      sort_order: query.sort_order,
    };

    return this.model.list(filters, false);
  }

  async getByIdAdmin(id) {
    const product = await this.model.findById(id);
    if (!product) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    return product;
  }

  async updateById(id, payload) {
    const normalizedPayload = this.normalizeProductPayload(payload);
    return this.withTransaction(async (executor) => {
      const existing = await this.model.findById(id, executor);
      if (!existing) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');


      const isActivatingProduct = normalizedPayload.status === 'active';

if (isActivatingProduct) {
  const effectiveImages =
    normalizedPayload.images !== undefined
      ? normalizedPayload.images
      : existing.images;

  if (!Array.isArray(effectiveImages) || effectiveImages.length === 0) {
    throw new AppError(
      'Add at least one product image before activating product',
      400,
      'PRODUCT_IMAGE_REQUIRED'
    );
  }
}


      const effectiveMrp = normalizedPayload.mrp !== undefined ? normalizedPayload.mrp : Number(existing.mrp);
      const effectiveSellingPrice =
        normalizedPayload.selling_price !== undefined
          ? normalizedPayload.selling_price
          : Number(existing.selling_price);
      if (effectiveSellingPrice > effectiveMrp) {
        throw new AppError('Selling price cannot be greater than MRP', 400, 'INVALID_PRICE');
      }

      if (normalizedPayload.name) {
        normalizedPayload.slug = await this.buildUniqueProductSlug(normalizedPayload.name, id, executor);
      }

      await this.assertUniqueFields({
        sku: normalizedPayload.sku,
        excludeId: id,
        executor,
      });
      await this.assertCategoryExists(normalizedPayload.category_id, executor);

      const { images, ...productData } = normalizedPayload;

if (Object.keys(productData).length > 0) {
  const updated = await this.model.updateById(id, productData, executor);
  if (!updated) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');

  if (productData.stock !== undefined) {
    await this.syncInventoryForProduct(id, productData.stock, executor);
  }
}

if (images !== undefined) {
  await this.model.replaceImages(id, images, executor);
}


      return this.model.findById(id, executor);
    });
  }

  async deleteById(id) {
    const deleted = await this.model.deleteById(id);
    if (!deleted) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    return { id };
  }

  async listPublic(query) {
    validateRange({
      min: query.minPrice,
      max: query.maxPrice,
      minLabel: 'minPrice',
      maxLabel: 'maxPrice',
    });

    const sortMap = {
      newest: { sortBy: 'created_at', sortOrder: 'DESC' },
      price_asc: { sortBy: 'selling_price', sortOrder: 'ASC' },
      price_desc: { sortBy: 'selling_price', sortOrder: 'DESC' },
      name_asc: { sortBy: 'name', sortOrder: 'ASC' },
    };

    const selectedSort = sortMap[query.sort] || sortMap.newest;

    const filters = {
      page: query.page,
      limit: query.limit,
      search: query.search,
      category_id: query.category_id,
      fabric: query.fabric,
      occasion: query.occasion,
      color: query.color,
      is_new_arrival: query.newArrival,
      min_price: query.minPrice,
      max_price: query.maxPrice,
      in_stock: query.inStock,
      sort_by: selectedSort.sortBy,
      sort_order: selectedSort.sortOrder,
    };

    const result = await this.model.list(filters, true);
    return {
      items: result.items,
      meta: result.meta,
    };
  }

  async getBySlugPublic(slug) {
    const product = await this.model.findPublicBySlug(slug);
    if (!product) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    return product;
  }

  async getPublicFilters(query) {
    return this.model.getPublicFilters(query);
  }

  async addProductImage(productId, payload) {
    const normalizedPayload = this.normalizeImagePayload(payload);
    return this.withTransaction(async (executor) => {
      const product = await this.model.findById(productId, executor);
      if (!product) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');

      const created = await this.model.createImage(productId, normalizedPayload, executor);
      return created;
    });
  }

  async listProductImages(productId) {
    const product = await this.model.findById(productId);
    if (!product) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    return this.model.listImagesByProductId(productId);
  }

  async updateProductImage(productId, imageId, payload) {
    const normalizedPayload = this.normalizeImagePayload(payload);
    return this.withTransaction(async (executor) => {
      const product = await this.model.findById(productId, executor);
      if (!product) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');

      const existingImage = await this.model.findImageById(productId, imageId, executor);
      if (!existingImage) throw new AppError('Product image not found', 404, 'PRODUCT_IMAGE_NOT_FOUND');

      return this.model.updateImage(productId, imageId, normalizedPayload, executor);
    });
  }

  async deleteProductImage(productId, imageId) {
    return this.withTransaction(async (executor) => {
      const product = await this.model.findById(productId, executor);
      if (!product) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');

      const existingImage = await this.model.findImageById(productId, imageId, executor);
      if (!existingImage) throw new AppError('Product image not found', 404, 'PRODUCT_IMAGE_NOT_FOUND');

      const deleted = await this.model.deleteImage(productId, imageId, executor);
      if (!deleted) throw new AppError('Product image not found', 404, 'PRODUCT_IMAGE_NOT_FOUND');
      return { id: imageId };
    });
  }

  async getSearchSuggestions(query) {
    return this.model.searchSuggestions({
      q: query.q,
      limit: query.limit,
    });
  }

  async getAdminSearchSuggestions(query) {
    return this.model.searchSuggestions({
      q: query.q,
      limit: query.limit,
      isPublic: false,
    });
  }
}

module.exports = {
  ProductService,
};
