const Joi = require('joi');
const { SORT_ORDER } = require('../common/constants');
const { validate } = require('../common/utils/validation');

const productIdParamsSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
});

const reviewIdParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().trim().min(2).max(150).allow('', null),
  comment: Joi.string().trim().min(2).max(2000).allow('', null),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5),
  title: Joi.string().trim().min(2).max(150).allow('', null),
  comment: Joi.string().trim().min(2).max(2000).allow('', null),
}).min(1);

const publicReviewListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort_by: Joi.string().valid('created_at', 'rating').default('created_at'),
  sort_order: Joi.string()
    .valid(SORT_ORDER.ASC, SORT_ORDER.DESC)
    .insensitive()
    .default(SORT_ORDER.DESC),
});

module.exports = {
  validate,
  productIdParamsSchema,
  reviewIdParamsSchema,
  createReviewSchema,
  updateReviewSchema,
  publicReviewListQuerySchema,
};
