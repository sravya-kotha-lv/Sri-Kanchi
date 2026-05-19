const AppError = require('../common/errors/app-error');

class RatingService {
  constructor({ model, db }) {
    this.model = model;
    this.db = db;
  }

  sanitizePayload(payload) {
    return {
      ...payload,
      title: payload.title === '' ? null : payload.title ?? null,
      comment: payload.comment === '' ? null : payload.comment ?? null,
    };
  }

  async ensureProductExists(productId) {
    const product = await this.model.findProductById(productId);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    return product;
  }

  async ensureProductIsActive(productId) {
    const product = await this.ensureProductExists(productId);
    if (String(product.status).toLowerCase() !== 'active') {
      throw new AppError('Reviews can be added only for active products', 400, 'PRODUCT_NOT_ACTIVE');
    }

    if (!product.category_is_active) {
      throw new AppError('Product category is not active', 400, 'CATEGORY_NOT_ACTIVE');
    }

    return product;
  }

  async createReview(productId, userId, payload) {
    await this.ensureProductIsActive(productId);

    const existing = await this.model.findByProductAndUser(productId, userId);
    if (existing) {
      throw new AppError('You have already reviewed this product', 409, 'REVIEW_ALREADY_EXISTS');
    }

    const created = await this.model.create({
      ...this.sanitizePayload(payload),
      product_id: productId,
      user_id: userId,
    });

    return this.model.findById(created.id);
  }

  async listPublicReviews(productId, query) {
    await this.ensureProductIsActive(productId);
    return this.model.listPublicByProduct(productId, query);
  }

  async getPublicSummary(productId) {
    await this.ensureProductIsActive(productId);
    return this.model.getPublicSummaryByProduct(productId);
  }

  async updateOwnReview(reviewId, userId, payload) {
    const review = await this.model.findById(reviewId);
    if (!review) throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    if (Number(review.user_id) !== Number(userId)) {
      throw new AppError('You can update only your own review', 403, 'FORBIDDEN');
    }

    await this.model.updateById(reviewId, this.sanitizePayload(payload));
    return this.model.findById(reviewId);
  }

  async deleteReview(reviewId, user) {
    const review = await this.model.findById(reviewId);
    if (!review) throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');

    const isOwner = Number(review.user_id) === Number(user.id);
const isAdmin = String(user.role || '').toLowerCase() === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError('You can delete only your own review', 403, 'FORBIDDEN');
    }

    await this.model.deleteById(reviewId);
    return { id: reviewId };
  }
}

module.exports = {
  RatingService,
};
