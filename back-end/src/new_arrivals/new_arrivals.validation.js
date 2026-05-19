const Joi = require("joi");

const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

const emailRule = Joi.string()
  .trim()
  .lowercase()
  .pattern(emailPattern)
  .messages({
    "string.pattern.base": "Email must be in a valid format like anusha@gmail.com",
  });

const newArrivalEmailBody = Joi.object({
  email: emailRule.required(),
});

module.exports = {
  newArrivalEmailBody,
};
