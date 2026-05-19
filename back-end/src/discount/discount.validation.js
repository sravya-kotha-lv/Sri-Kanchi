const Joi = require('joi');
const { DISCOUNT_TYPE, SORT_ORDER } = require('../common/constants');
const { validate } = require('../common/utils/validation');

const DISCOUNT_TYPES = [DISCOUNT_TYPE.PERCENTAGE, DISCOUNT_TYPE.FIXED];
const APPLIES_TO = ['all', 'product', 'category'];
const DISCOUNT_STATUSES = ['active', 'inactive'];

const baseDiscountSchema = {
  title: Joi.string().trim().min(2).max(255),
  code: Joi.string().trim().uppercase().alphanum().min(3).max(50),
  description: Joi.string().trim().allow('', null),
  type: Joi.string().valid(...DISCOUNT_TYPES),
  value: Joi.number().precision(2).min(0.01),
  applies_to: Joi.string().valid(...APPLIES_TO),
  product_id: Joi.number().integer().positive().allow(null),
  category_id: Joi.number().integer().positive().allow(null),
  min_order_amount: Joi.number().precision(2).min(0).allow(null),
  max_discount_amount: Joi.number().precision(2).min(0).allow(null),
  starts_at: Joi.date().iso(),
  ends_at: Joi.date().iso(),
  usage_limit: Joi.number().integer().min(1).allow(null),
  per_user_limit: Joi.number().integer().min(1).allow(null),
  is_active: Joi.boolean(),
};

const createDiscountSchema = Joi.object({
  ...baseDiscountSchema,
  title: baseDiscountSchema.title.required(),
  code: baseDiscountSchema.code.required(),
  type: baseDiscountSchema.type.required(),
  value: baseDiscountSchema.value.required(),
  applies_to: baseDiscountSchema.applies_to.required(),
  starts_at: baseDiscountSchema.starts_at.required(),
  ends_at: baseDiscountSchema.ends_at.required(),
  is_active: baseDiscountSchema.is_active.default(true),
})
  .custom((value, helpers) => {
    if (new Date(value.starts_at) >= new Date(value.ends_at)) {
      return helpers.error('any.invalid', { message: 'starts_at must be before ends_at' });
    }
    if (value.type === 'percentage' && value.value > 100) {
      return helpers.error('any.invalid', { message: 'percentage discount cannot exceed 100' });
    }
    if (value.applies_to === 'product' && !value.product_id) {
      return helpers.error('any.invalid', { message: 'product_id is required when applies_to=product' });
    }
    if (value.applies_to === 'category' && !value.category_id) {
      return helpers.error('any.invalid', { message: 'category_id is required when applies_to=category' });
    }
    if (value.applies_to === 'all' && (value.product_id || value.category_id)) {
      return helpers.error('any.invalid', { message: 'product_id/category_id must be null when applies_to=all' });
    }
    return value;
  })
  .messages({
    'any.invalid': '{{#message}}',
  });

const updateDiscountSchema = Joi.object({
  ...baseDiscountSchema,
})
  .min(1)
  .custom((value, helpers) => {
    if (value.starts_at && value.ends_at && new Date(value.starts_at) >= new Date(value.ends_at)) {
      return helpers.error('any.invalid', { message: 'starts_at must be before ends_at' });
    }
    if (value.type === 'percentage' && value.value !== undefined && value.value > 100) {
      return helpers.error('any.invalid', { message: 'percentage discount cannot exceed 100' });
    }
    return value;
  })
  .messages({
    'any.invalid': '{{#message}}',
  });

const idParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const adminListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null),
  is_active: Joi.boolean(),
  type: Joi.string().valid(...DISCOUNT_TYPES),
  applies_to: Joi.string().valid(...APPLIES_TO),
  status: Joi.string().valid(...DISCOUNT_STATUSES),
  sort_by: Joi.string()
    .valid('id', 'title', 'code', 'type', 'value', 'starts_at', 'ends_at', 'created_at')
    .default('created_at'),
  sort_order: Joi.string()
    .valid(SORT_ORDER.ASC, SORT_ORDER.DESC)
    .insensitive()
    .default(SORT_ORDER.DESC),
});

const validateCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().required(),
  order_amount: Joi.number().precision(2).min(0).required(),
  product_id: Joi.number().integer().positive().allow(null),
  category_id: Joi.number().integer().positive().allow(null),
  user_id: Joi.number().integer().positive().allow(null),
});

const activeOffersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  product_id: Joi.number().integer().positive(),
  category_id: Joi.number().integer().positive(),
});

module.exports = {
  validate,
  createDiscountSchema,
  updateDiscountSchema,
  idParamsSchema,
  adminListQuerySchema,
  validateCouponSchema,
  activeOffersQuerySchema,
};
