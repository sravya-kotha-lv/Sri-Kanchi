const Joi = require("joi");


const nameRule = Joi.string()
  .trim()
  .min(2)
  .max(150)
  .pattern(/^(?!.*@)[A-Za-z][A-Za-z .'-]*$/)
  .messages({
    "string.empty": "Full name is required",
    "string.min": "Full name must be at least 2 characters",
    "string.max": "Full name must be 150 characters or less",
    "string.pattern.base": "Full name must contain only letters, spaces, dot, apostrophe, or hyphen",
  });

const phoneRule = Joi.string()
  .trim()
  .pattern(/^[6-9]\d{9}$/)
  .messages({
    "string.empty": "Phone number is required",
    "string.pattern.base": "Phone number must start with 6, 7, 8, or 9 and contain exactly 10 digits",
  });

const addressTypeSchema = Joi.string()
  .valid("home", "work", "other")
  .default("home");

const createAddressSchema = Joi.object({
  full_name: nameRule.required(),
  phone: phoneRule.required(),
  pincode: Joi.string().trim().min(4).max(10).required(),
  address_line1: Joi.string().trim().min(5).max(500).required(),
  address_line2: Joi.string().trim().max(500).allow(null, ""),
  city: Joi.string().trim().min(2).max(100).required(),
  state: Joi.string().trim().min(2).max(100).required(),
  landmark: Joi.string().trim().max(150).allow(null, ""),
  address_type: addressTypeSchema,
  is_default: Joi.boolean().default(false),
});

const updateAddressSchema = Joi.object({
  full_name: nameRule,
  phone: phoneRule,
  pincode: Joi.string().trim().min(4).max(10),
  address_line1: Joi.string().trim().min(5).max(500),
  address_line2: Joi.string().trim().max(500).allow(null, ""),
  city: Joi.string().trim().min(2).max(100),
  state: Joi.string().trim().min(2).max(100),
  landmark: Joi.string().trim().max(150).allow(null, ""),
  address_type: addressTypeSchema,
  is_default: Joi.boolean(),
}).min(1);

const addressParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

module.exports = {
  createAddressSchema,
  updateAddressSchema,
  addressParamsSchema,
};
