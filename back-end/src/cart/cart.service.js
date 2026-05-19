const AppError = require('../common/errors/app-error');
const TransactionalService = require('../common/services/transactional-service');

class CartService extends TransactionalService {
  constructor({ model, db }) {
    super(db);
    this.model = model;
    this.db = db;
  }

  async assertProductAvailable(productId, quantity, executor) {
    const product = await this.model.findProductById(productId, executor);

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (!product.category_is_active) {
      throw new AppError('Product category is not active', 400, 'CATEGORY_NOT_ACTIVE');
    }

    if (product.status !== 'active') {
      throw new AppError('Only active products can be added to cart', 400, 'PRODUCT_NOT_ACTIVE');
    }

    if (Number(product.stock) < Number(quantity)) {
      throw new AppError('Requested quantity is not available in stock', 400, 'INSUFFICIENT_STOCK');
    }

    return product;
  }

  buildCartResponse(cart, items) {
    const subtotal = items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);

    return {
      id: cart.id,
      user_id: cart.user_id,
      guest_token: cart.guest_token,
      items: items.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        line_total: Number(item.line_total),
        product: {
          id: item.product_id,
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          stock: item.stock,
          status: item.status,
          image_url: item.image_url,
        },
      })),
      summary: {
        item_count: items.length,
        total_quantity: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        subtotal: Number(subtotal.toFixed(2)),
      },
      created_at: cart.created_at,
      updated_at: cart.updated_at,
    };
  }

  async getCart(actor, executor = this.db) {
    const cart = await this.model.getOrCreateCart(actor, executor);
    const items = await this.model.listCartItems(cart.id, executor);
    return this.buildCartResponse(cart, items);
  }

  async addItem(actor, payload) {
    return this.withTransaction(async (executor) => {
      const cart = await this.model.getOrCreateCart(actor, executor);
      const existingItem = await this.model.findCartItemByProductId(cart.id, payload.product_id, executor);
      const nextQuantity = (existingItem?.quantity || 0) + payload.quantity;
      const product = await this.assertProductAvailable(payload.product_id, nextQuantity, executor);

      await this.model.addOrIncrementCartItem(
        cart.id,
        payload.product_id,
        payload.quantity,
        product.selling_price,
        executor
      );

      return this.getCart(actor, executor);
    });
  }

  async updateItem(actor, itemId, payload) {
    return this.withTransaction(async (executor) => {
      const cart = await this.model.getOrCreateCart(actor, executor);
      const existingItem = await this.model.findCartItemById(cart.id, itemId, executor);

      if (!existingItem) {
        throw new AppError('Cart item not found', 404, 'CART_ITEM_NOT_FOUND');
      }

      const product = await this.assertProductAvailable(existingItem.product_id, payload.quantity, executor);
      await this.model.updateCartItemQuantity(
        cart.id,
        itemId,
        payload.quantity,
        product.selling_price,
        executor
      );

      return this.getCart(actor, executor);
    });
  }

  async removeItem(actor, itemId) {
    return this.withTransaction(async (executor) => {
      const cart = await this.model.getOrCreateCart(actor, executor);
      const deleted = await this.model.deleteCartItem(cart.id, itemId, executor);

      if (!deleted) {
        throw new AppError('Cart item not found', 404, 'CART_ITEM_NOT_FOUND');
      }

      return this.getCart(actor, executor);
    });
  }

  async clearCart(actor) {
    return this.withTransaction(async (executor) => {
      const cart = await this.model.getOrCreateCart(actor, executor);
      await this.model.clearCart(cart.id, executor);
      return this.getCart(actor, executor);
    });
  }
}

module.exports = {
  CartService,
};
