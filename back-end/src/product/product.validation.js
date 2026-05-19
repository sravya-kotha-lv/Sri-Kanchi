const Joi = require('joi');
const { PRODUCT_STATUS, SORT_ORDER } = require('../common/constants');
const { validate } = require('../common/utils/validation');

const sortableFields = [
  'id',
  'name',
  'slug',
  'sku',
  'mrp',
  'selling_price',
  'stock',
  'created_at',
  'updated_at',
];

const imageSchema = Joi.object({
  image_url: Joi.string().uri(),
  upload_url: Joi.string().uri(),
  alt_text: Joi.string().max(255).allow('', null).default(null),
  is_primary: Joi.boolean().default(false),
  sort_order: Joi.number().integer().min(0).default(0),
}).or('image_url', 'upload_url');

const baseProductSchema = {
  name: Joi.string().trim().min(2).max(255),
  sku: Joi.string().trim().uppercase().min(2).max(100),
  short_description: Joi.string().trim().allow('', null),
  description: Joi.string().trim().allow('', null),
  category_id: Joi.number().integer().positive(),
  fabric: Joi.string().trim().max(100).allow('', null),
  occasion: Joi.string().trim().max(100).allow('', null),
  color: Joi.string().trim().max(100).allow('', null),
  blouse_included: Joi.boolean(),
  mrp: Joi.number().precision(2).min(0),
  selling_price: Joi.number().precision(2).min(0),
  stock: Joi.number().integer().min(0),
  is_new_arrival: Joi.boolean(),
  status: Joi.string().trim().valid(
    PRODUCT_STATUS.DRAFT,
    PRODUCT_STATUS.ACTIVE,
    PRODUCT_STATUS.INACTIVE,
    PRODUCT_STATUS.ARCHIVED
  ),
  created_by: Joi.number().integer().positive().allow(null),
  updated_by: Joi.number().integer().positive().allow(null),
  images: Joi.array().items(imageSchema),

};

const createProductSchema = Joi.object({
  ...baseProductSchema,
  name: baseProductSchema.name.required(),
  sku: baseProductSchema.sku.required(),
  category_id: baseProductSchema.category_id.required(),
  mrp: baseProductSchema.mrp.required(),
  selling_price: baseProductSchema.selling_price.required(),
  stock: baseProductSchema.stock.required(),
  status: baseProductSchema.status.default('draft'),
  blouse_included: baseProductSchema.blouse_included.default(false),
  is_new_arrival: baseProductSchema.is_new_arrival.default(false),
  images: baseProductSchema.images.default([]),
});


const updateProductSchema = Joi.object({
  ...baseProductSchema,
}).min(1);

const idParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const slugParamsSchema = Joi.object({
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).required(),
});

const imageParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  imageId: Joi.number().integer().positive().required(),
});

const createProductImageSchema = Joi.object({
  image_url: Joi.string().uri(),
  upload_url: Joi.string().uri(),
  alt_text: Joi.string().trim().max(255).allow('', null).default(null),
  sort_order: Joi.number().integer().min(0).default(0),
  is_primary: Joi.boolean().default(false),
}).or('image_url', 'upload_url');

const updateProductImageSchema = Joi.object({
  image_url: Joi.string().uri(),
  upload_url: Joi.string().uri(),
  alt_text: Joi.string().trim().max(255).allow('', null),
  sort_order: Joi.number().integer().min(0),
  is_primary: Joi.boolean(),
}).min(1);

const adminListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null),
  category_id: Joi.number().integer().positive(),
  fabric: Joi.string().trim().allow('', null),
  occasion: Joi.string().trim().allow('', null),
  color: Joi.string().trim().allow('', null),
  status: Joi.string().trim().valid(
    PRODUCT_STATUS.DRAFT,
    PRODUCT_STATUS.ACTIVE,
    PRODUCT_STATUS.INACTIVE,
    PRODUCT_STATUS.ARCHIVED
  ),
  is_new_arrival: Joi.boolean(),
  min_price: Joi.number().min(0),
  max_price: Joi.number().min(0),
  in_stock: Joi.boolean(),
  sort_by: Joi.string().valid(...sortableFields).default('created_at'),
  sort_order: Joi.string()
    .valid(SORT_ORDER.ASC, SORT_ORDER.DESC)
    .insensitive()
    .default(SORT_ORDER.DESC),
});

const publicListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null),
  category_id: Joi.number().integer().positive(),
  fabric: Joi.string().trim().allow('', null),
  occasion: Joi.string().trim().allow('', null),
  color: Joi.string().trim().allow('', null),
  newArrival: Joi.boolean(),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  inStock: Joi.boolean(),
  sort: Joi.string()
    .valid('newest', 'price_asc', 'price_desc', 'name_asc')
    .default('newest'),
});

const publicFiltersQuerySchema = Joi.object({
  category_id: Joi.number().integer().positive(),
  occasion: Joi.string().trim().allow('', null),
});

const searchSuggestionsQuerySchema = Joi.object({
  q: Joi.string().trim().min(1).max(100).required(),
  limit: Joi.number().integer().min(1).max(10).default(8),
});

module.exports = {
  validate,
  createProductSchema,
  updateProductSchema,
  idParamsSchema,
  slugParamsSchema,
  imageParamsSchema,
  adminListQuerySchema,
  publicListQuerySchema,
  publicFiltersQuerySchema,
  searchSuggestionsQuerySchema,
  createProductImageSchema,
  updateProductImageSchema,
};
