const Joi = require("joi");
const { ROLES } = require("../config/constants");

const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const phonePattern = /^[6-9]\d{9}$/;

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
const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\W_]{8,128}$/;

const emailRule = Joi.string()
  .trim()
  .lowercase()
  .pattern(emailPattern)
  .messages({
    "string.pattern.base": "Email must be in a valid format like anusha@gmail.com",
  });

const passwordRule = Joi.string()
  .min(8)
  .max(128)
  .pattern(passwordPattern)
  .messages({
    "string.pattern.base":
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  });

const phoneRule = Joi.string()
  .trim()
  .pattern(phonePattern)
  .messages({
    "string.pattern.base": "Phone number must start with 6, 7, 8, or 9 and contain exactly 10 digits",
  });

const otpRule = Joi.string().trim().length(6);

const loginBody = Joi.object({
  email: emailRule.required(),
  password: Joi.string().min(6).required(),
});

const registerBody = Joi.object({
  name: nameRule.required(),
  email: emailRule.required(),
  phone: phoneRule.allow(null, ""),
  password: passwordRule.required(),
});

const registerAdminBody = Joi.object({
  name: nameRule.required(),
  email: emailRule.required(),
  phone: phoneRule.allow(null, ""),
  password: passwordRule.required(),
  role: Joi.string()
    .valid(ROLES.ADMIN, ROLES.SUPERADMIN)
    .default(ROLES.ADMIN),
});

const updateUserRoleParams = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const updateUserRoleBody = Joi.object({
  role: Joi.string()
    .valid(ROLES.USER, ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.CUSTOMER)
    .required(),
});

const changePasswordBody = Joi.object({
  currentPassword: Joi.string().min(6),
  current_password: Joi.string().min(6),
  newPassword: passwordRule,
  new_password: passwordRule,
}).custom((value, helpers) => {
  const currentPassword = value.currentPassword || value.current_password;
  const newPassword = value.newPassword || value.new_password;

  if (!currentPassword) {
    return helpers.error("any.custom", {
      message: '"currentPassword" is required',
      path: ["currentPassword"],
    });
  }

  if (!newPassword) {
    return helpers.error("any.custom", {
      message: '"newPassword" is required',
      path: ["newPassword"],
    });
  }

  if (currentPassword === newPassword) {
    return helpers.error("any.invalid");
  }

  return value;
}, "password difference validation");


const verifyEmailBody=Joi.object({
  email:emailRule.required(),
  otp:otpRule.required(),
});


const resendEmailOtpBody=Joi.object({
  email:emailRule.required(),
});

const forgetPasswordBody=Joi.object({
  email:emailRule.required(),
});

const resetPasswordBody=Joi.object({
  email:emailRule.required(),
  otp:otpRule.required(),
  newPassword:passwordRule.required(),
});

const updateProfileBody = Joi.object({
  name: nameRule,
  phone: phoneRule.allow(null, ""),
}).min(1);



module.exports = {
  loginBody,
  registerBody,
  registerAdminBody,
  updateUserRoleParams,
  updateUserRoleBody,
  changePasswordBody,
  verifyEmailBody,
  resendEmailOtpBody,
  forgetPasswordBody,
  resetPasswordBody,
  updateProfileBody,

};
