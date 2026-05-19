const AppError = require('../common/errors/app-error');
const TransactionalService = require('../common/services/transactional-service');
const { INVENTORY_STATUS } = require('../common/constants');

class InventoryService extends TransactionalService {
  constructor({ model, db }) {
    super(db);
    this.model = model;
    this.db = db;
  }

  calculateStockStatus({ available_stock, low_stock_threshold }) {
    if (available_stock <= 0) return INVENTORY_STATUS.OUT_OF_STOCK;
    if (available_stock <= low_stock_threshold) return INVENTORY_STATUS.LOW_STOCK;
    return INVENTORY_STATUS.IN_STOCK;
  }

  isLowStock({ available_stock, low_stock_threshold }) {
    return available_stock > 0 && available_stock <= low_stock_threshold;
  }

  normalizeInventoryState(current, payload) {
    const availableStock =
      payload.available_stock !== undefined ? payload.available_stock : Number(current.available_stock);
    const reservedStock =
      payload.reserved_stock !== undefined ? payload.reserved_stock : Number(current.reserved_stock || 0);
    const lowStockThreshold =
      payload.low_stock_threshold !== undefined
        ? payload.low_stock_threshold
        : Number(current.low_stock_threshold || 0);

    if (reservedStock > availableStock) {
      throw new AppError('reserved_stock cannot be greater than available_stock', 400, 'INVALID_STOCK_STATE');
    }

    return {
      available_stock: availableStock,
      reserved_stock: reservedStock,
      low_stock_threshold: lowStockThreshold,
      stock_status: this.calculateStockStatus({
        available_stock: availableStock,
        low_stock_threshold: lowStockThreshold,
      }),
    };
  }

  async ensureInventoryRow(productId, executor = this.db) {
    const existing = await this.model.findByProductId(productId, executor);
    if (existing) return existing;

    const product = await this.model.getProductById(productId, executor);
    if (!product) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');

    const availableStock = Number(product.stock || 0);
    const lowStockThreshold = 5;
    return this.model.create(
      {
        product_id: productId,
        available_stock: availableStock,
        reserved_stock: 0,
        low_stock_threshold: lowStockThreshold,
        stock_status: this.calculateStockStatus({
          available_stock: availableStock,
          low_stock_threshold: lowStockThreshold,
        }),
      },
      executor
    );
  }

  async listAdmin(query) {
    return this.model.list(query);
  }

  async getByProductId(productId) {
    const record = await this.ensureInventoryRow(productId);
    return record;
  }

  async patchByProductId(productId, payload) {
    return this.withTransaction(async (executor) => {
      const current = await this.ensureInventoryRow(productId, executor);
      const merged = this.normalizeInventoryState(current, payload);

      await this.model.upsertByProductId(
        {
          product_id: productId,
          ...merged,
        },
        executor
      );
      await this.model.syncProductStock(productId, merged.available_stock, executor);
      return this.model.findByProductId(productId, executor);
    });
  }

  async adjustStock(payload) {
    return this.withTransaction(async (executor) => {
      const productId = payload.product_id;
      await this.ensureInventoryRow(productId, executor);
      const current = await this.model.findByProductIdForUpdate(productId, executor);
      if (!current) throw new AppError('Inventory not found', 404, 'INVENTORY_NOT_FOUND');

      const currentAvailable = Number(current.available_stock);
      const currentReserved = Number(current.reserved_stock || 0);
      const currentThreshold = Number(current.low_stock_threshold || 0);
      const quantity = Number(payload.quantity);

      let nextAvailable = currentAvailable;
      let nextReserved = currentReserved;

      switch (payload.adjustment_type) {
        case 'increase':
          nextAvailable = currentAvailable + quantity;
          break;
        case 'decrease':
          nextAvailable = currentAvailable - quantity;
          break;
        case 'set':
          nextAvailable = quantity;
          break;
        case 'reserve':
          nextAvailable = currentAvailable - quantity;
          nextReserved = currentReserved + quantity;
          break;
        case 'release':
          nextAvailable = currentAvailable + quantity;
          nextReserved = currentReserved - quantity;
          break;
        default:
          throw new AppError('Invalid adjustment_type', 400, 'INVALID_ADJUSTMENT_TYPE');
      }

      if (nextAvailable < 0) {
        throw new AppError('Insufficient available stock for adjustment', 400, 'INSUFFICIENT_STOCK');
      }
      if (nextReserved < 0) {
        throw new AppError('Reserved stock cannot be negative', 400, 'INVALID_RESERVED_STOCK');
      }
      if (nextReserved > nextAvailable) {
        throw new AppError('reserved_stock cannot exceed available_stock', 400, 'INVALID_STOCK_STATE');
      }

      const lowStockThreshold =
        payload.low_stock_threshold !== undefined ? payload.low_stock_threshold : currentThreshold;
      const stockStatus = this.calculateStockStatus({
        available_stock: nextAvailable,
        low_stock_threshold: lowStockThreshold,
      });

      await this.model.upsertByProductId(
        {
          product_id: productId,
          available_stock: nextAvailable,
          reserved_stock: nextReserved,
          low_stock_threshold: lowStockThreshold,
          stock_status: stockStatus,
        },
        executor
      );

      await this.model.syncProductStock(productId, nextAvailable, executor);

      return this.model.findByProductId(productId, executor);
    });
  }

  async listLowStock(query) {
    return this.model.listLowStock(query);
  }
}

module.exports = {
  InventoryService,
};
