const Joi = require('joi');

const productIdSchema = Joi.number().integer().positive().required();

const wishlistItemParamsSchema = Joi.object({
  itemId: Joi.number().integer().positive().required(),
});

const addWishlistItemSchema = Joi.object({
  product_id: productIdSchema,
});

module.exports = {
  addWishlistItemSchema,
  wishlistItemParamsSchema,
};
