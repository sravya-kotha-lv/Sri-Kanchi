const Joi = require('joi');
const { INVENTORY_STATUS, SORT_ORDER } = require('../common/constants');
const { validate } = require('../common/utils/validation');

const STOCK_STATUSES = [
  INVENTORY_STATUS.IN_STOCK,
  INVENTORY_STATUS.LOW_STOCK,
  INVENTORY_STATUS.OUT_OF_STOCK,
];
const ADJUSTMENT_TYPES = ['increase', 'decrease', 'set', 'reserve', 'release'];

const productIdParamsSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
});

const adminInventoryListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null),
  stock_status: Joi.string().valid(...STOCK_STATUSES),
  low_stock_only: Joi.boolean().default(false),
  sort_by: Joi.string()
    .valid('id', 'product_id', 'available_stock', 'reserved_stock', 'low_stock_threshold', 'updated_at')
    .default('updated_at'),
  sort_order: Joi.string()
    .valid(SORT_ORDER.ASC, SORT_ORDER.DESC)
    .insensitive()
    .default(SORT_ORDER.DESC),
});

const patchInventorySchema = Joi.object({
  available_stock: Joi.number().integer().min(0),
  reserved_stock: Joi.number().integer().min(0),
  low_stock_threshold: Joi.number().integer().min(0),
})
  .min(1)
  .custom((value, helpers) => {
    if (
      value.available_stock !== undefined &&
      value.reserved_stock !== undefined &&
      value.reserved_stock > value.available_stock
    ) {
      return helpers.error('any.invalid', {
        message: 'reserved_stock cannot be greater than available_stock',
      });
    }
    return value;
  })
  .messages({
    'any.invalid': '{{#message}}',
  });

const adjustInventorySchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  adjustment_type: Joi.string()
    .valid(...ADJUSTMENT_TYPES)
    .required(),
  quantity: Joi.number().integer().min(0).required(),
  low_stock_threshold: Joi.number().integer().min(0),
  note: Joi.string().trim().max(500).allow('', null),
}).custom((value, helpers) => {
  if (value.adjustment_type !== 'set' && value.quantity < 1) {
    return helpers.error('any.invalid', { message: 'quantity must be at least 1 for this adjustment_type' });
  }
  return value;
});

const lowStockQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort_by: Joi.string().valid('available_stock', 'low_stock_threshold', 'updated_at').default('updated_at'),
  sort_order: Joi.string()
    .valid(SORT_ORDER.ASC, SORT_ORDER.DESC)
    .insensitive()
    .default(SORT_ORDER.ASC),
});

module.exports = {
  validate,
  productIdParamsSchema,
  adminInventoryListQuerySchema,
  patchInventorySchema,
  adjustInventorySchema,
  lowStockQuerySchema,
};
