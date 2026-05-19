const Joi = require("joi");

const placeOrderSchema = Joi.object({
  customer_name: Joi.string()
    .trim()
    .min(2)
    .max(150)
    .pattern(/^[\p{L} .'-]+$/u)
    .required()
    .messages({
      "string.pattern.base":
        "Customer name should contain only letters, spaces, dot, apostrophe, or hyphen",
    }),

  customer_phone: Joi.string()
    .trim()
    .pattern(/^\+?[1-9]\d{7,14}$/)
    .allow(null, "")
    .messages({
      "string.pattern.base":
        "Phone number must be a valid international phone number",
    }),

  shipping_address: Joi.string().trim().min(10).max(1000).required(),

  payment_method: Joi.string()
    .valid("cash_on_delivery")
    .default("cash_on_delivery"),
});

const orderParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

module.exports = {
  placeOrderSchema,
  orderParamsSchema,
};
