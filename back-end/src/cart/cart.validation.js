const Joi = require('joi');

const productIdSchema = Joi.number().integer().positive().required();

const cartItemParamsSchema = Joi.object({
  itemId: Joi.number().integer().positive().required(),
});

const addCartItemSchema = Joi.object({
  product_id: productIdSchema,
  quantity: Joi.number().integer().min(1).max(20).required(),
});

const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(20).required(),
});

module.exports = {
  addCartItemSchema,
  updateCartItemSchema,
  cartItemParamsSchema,
};
