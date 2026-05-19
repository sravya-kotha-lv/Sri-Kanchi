const Joi = require("joi");

const createCategoryBody = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  description: Joi.string().allow("", null),
  image_url: Joi.string().uri().allow("", null).messages({
  "string.uri": "Category image must be a valid URL",
}),
  is_active: Joi.boolean().default(true),
});

const updateCategoryBody = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  description: Joi.string().allow("", null),
  image_url: Joi.string().uri().allow("", null),
  is_active: Joi.boolean(),
}).min(1);

const categoryParams = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const categorySlugParams = Joi.object({
  slug: Joi.string().trim().lowercase().required(),
});

const listCategoriesQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().allow(""),
  is_active: Joi.boolean(),
});

module.exports = {
  createCategoryBody,
  updateCategoryBody,
  categoryParams,
  categorySlugParams,
  listCategoriesQuery,
};
