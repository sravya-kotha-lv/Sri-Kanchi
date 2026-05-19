const Joi = require("joi");

const contactMailSchema = Joi.object({
  full_name: Joi.string()
    .trim()
    .min(2)
    .max(150)
    .pattern(/^[\p{L} .'-]+$/u)
    .required()
    .messages({
      "string.pattern.base":
        "Full name should contain only letters, spaces, dot, apostrophe, or hyphen",
    }),

  phone_number: Joi.string()
    .trim()
    .pattern(/^\+?[1-9]\d{7,14}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Phone number must be a valid international phone number",
    }),

  email: Joi.string().trim().lowercase().email().required(),

  subject: Joi.string().trim().min(3).max(200).required(),

  message: Joi.string().trim().min(10).max(2000).required(),
});

module.exports = {
  contactMailSchema,
};
