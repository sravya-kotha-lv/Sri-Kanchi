const Joi = require('joi');
const { validate } = require('../common/utils/validation');

const summaryQuerySchema = Joi.object({});

const publicLimit = Joi.number().integer().min(1).max(50);

const topProductsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const lowStockQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(20),
});

const categorySummaryQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(20),
});

const publicDashboardHomeQuerySchema = Joi.object({
  hero_limit: publicLimit.default(5),
  category_limit: publicLimit.default(8),
  deal_limit: publicLimit.default(10),
  product_limit: publicLimit.default(12),
});

const publicDashboardSectionQuerySchema = Joi.object({
  limit: publicLimit.default(10),
});

module.exports = {
  validate,
  summaryQuerySchema,
  topProductsQuerySchema,
  lowStockQuerySchema,
  categorySummaryQuerySchema,
  publicDashboardHomeQuerySchema,
  publicDashboardSectionQuerySchema,
};
