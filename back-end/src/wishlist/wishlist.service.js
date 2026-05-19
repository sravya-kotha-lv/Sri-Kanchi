const AppError = require('../common/errors/app-error');
const TransactionalService = require('../common/services/transactional-service');

class WishlistService extends TransactionalService {
  constructor({ model, db }) {
    super(db);
    this.model = model;
    this.db = db;
  }

  buildWishlistResponse(items) {
    return {
      items: items.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        product: {
          id: item.product_id,
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          mrp: Number(item.mrp),
          selling_price: Number(item.selling_price),
          stock: item.stock,
          status: item.status,
          image_url: item.image_url,
        },
      })),
      summary: {
        item_count: items.length,
      },
    };
  }

  async assertProductCanBeWishlisted(productId, executor) {
    const product = await this.model.findProductById(productId, executor);

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (product.status !== 'active') {
      throw new AppError('Only active products can be added to wishlist', 400, 'PRODUCT_NOT_ACTIVE');
    }

    if (!product.category_is_active) {
      throw new AppError('Product category is not active', 400, 'CATEGORY_NOT_ACTIVE');
    }

    return product;
  }

  async getWishlist(actor, executor = this.db) {
    const items = await this.model.listItems(actor, executor);
    return this.buildWishlistResponse(items);
  }

  async addItem(actor, payload) {
    return this.withTransaction(async (executor) => {
      await this.assertProductCanBeWishlisted(payload.product_id, executor);
      await this.model.addItem(actor, payload.product_id, executor);
      return this.getWishlist(actor, executor);
    });
  }

  async removeItem(actor, itemId) {
    return this.withTransaction(async (executor) => {
      const deleted = await this.model.deleteItem(actor, itemId, executor);

      if (!deleted) {
        throw new AppError('Wishlist item not found', 404, 'WISHLIST_ITEM_NOT_FOUND');
      }

      return this.getWishlist(actor, executor);
    });
  }

  async clearWishlist(actor) {
    return this.withTransaction(async (executor) => {
      await this.model.clearWishlist(actor, executor);
      return this.getWishlist(actor, executor);
    });
  }
}

module.exports = {
  WishlistService,
};
