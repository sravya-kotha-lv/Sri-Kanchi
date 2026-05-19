const AppError = require('../common/errors/app-error');

class DiscountService {
  constructor({ model, db }) {
    this.model = model;
    this.db = db;
  }

  validateDateRange(startsAt, endsAt) {
    if (!startsAt || !endsAt) return;
    if (new Date(startsAt) >= new Date(endsAt)) {
      throw new AppError('starts_at must be before ends_at', 400, 'INVALID_DATE_RANGE');
    }
  }

  validateDiscountValue(type, value) {
    if (type === 'percentage' && value > 100) {
      throw new AppError('Percentage discount cannot exceed 100', 400, 'INVALID_DISCOUNT_VALUE');
    }
    if (value <= 0) {
      throw new AppError('Discount value must be greater than 0', 400, 'INVALID_DISCOUNT_VALUE');
    }
  }

  validateScope({ applies_to, product_id, category_id }) {
    if (applies_to === 'product' && !product_id) {
      throw new AppError('product_id is required when applies_to is product', 400, 'INVALID_SCOPE');
    }
    if (applies_to === 'category' && !category_id) {
      throw new AppError('category_id is required when applies_to is category', 400, 'INVALID_SCOPE');
    }
    if (applies_to === 'all' && (product_id || category_id)) {
      throw new AppError('product_id and category_id must be null when applies_to is all', 400, 'INVALID_SCOPE');
    }
  }

  calculateDiscountAmount(discount, orderAmount) {
    let amount = 0;
    if (discount.type === 'percentage') {
      amount = (orderAmount * Number(discount.value)) / 100;
    } else {
      amount = Number(discount.value);
    }

    if (discount.max_discount_amount !== null && discount.max_discount_amount !== undefined) {
      amount = Math.min(amount, Number(discount.max_discount_amount));
    }

    amount = Math.min(amount, orderAmount);
    return Number(amount.toFixed(2));
  }

  applyDiscount(discount, orderAmount) {
    const discountAmount = this.calculateDiscountAmount(discount, orderAmount);
    const finalAmount = Number((orderAmount - discountAmount).toFixed(2));
    return {
      discountAmount,
      finalAmount,
    };
  }

  async assertUniqueCode(code, excludeId) {
    const exists = await this.model.existsByCode(code, excludeId);
    if (exists) {
      throw new AppError('Discount code already exists', 409, 'DUPLICATE_DISCOUNT_CODE');
    }
  }

  async create(payload) {
    this.validateDateRange(payload.starts_at, payload.ends_at);
    this.validateDiscountValue(payload.type, payload.value);
    this.validateScope(payload);
    await this.assertUniqueCode(payload.code);
    return this.model.create(payload);
  }

  async listAdmin(query) {
    return this.model.list(query, false);
  }

  async getByIdAdmin(id) {
    const discount = await this.model.findById(id);
    if (!discount) throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
    return discount;
  }

  async updateById(id, payload) {
    const existing = await this.model.findById(id);
    if (!existing) throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');

    const merged = { ...existing, ...payload };
    this.validateDateRange(merged.starts_at, merged.ends_at);
    this.validateDiscountValue(merged.type, merged.value);
    this.validateScope(merged);

    if (payload.code && payload.code !== existing.code) {
      await this.assertUniqueCode(payload.code, id);
    }

    const updated = await this.model.updateById(id, payload);
    if (!updated) throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
    return updated;
  }

  async deleteById(id) {
    const deleted = await this.model.deleteById(id);
    if (!deleted) throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
    return { id };
  }

  async validateCoupon(payload) {
    const discount = await this.model.findApplicableByCode(payload.code, payload);
    if (!discount) {
      throw new AppError('Coupon is invalid or inactive', 404, 'COUPON_INVALID');
    }

    if (discount.min_order_amount && Number(payload.order_amount) < Number(discount.min_order_amount)) {
      throw new AppError(
        `Minimum order amount should be ${discount.min_order_amount}`,
        400,
        'MIN_ORDER_NOT_MET'
      );
    }

    const totals = this.applyDiscount(discount, Number(payload.order_amount));

    return {
      coupon: discount,
      orderAmount: Number(payload.order_amount),
      discountAmount: totals.discountAmount,
      finalAmount: totals.finalAmount,
    };
  }

  async getActiveOffers(query) {
    return this.model.list(
      {
        ...query,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
      true
    );
  }
}

module.exports = {
  DiscountService,
};
