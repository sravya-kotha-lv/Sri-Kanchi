const authController = require("./auth.controller");
const authValidation = require("./auth.validation");
const { validateRequest } = require("../common/utils/request-validation");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { ROLES } = require("../config/constants");

async function authRoutes(fastify) {
  fastify.post(
    "/register",
    {
      preValidation: [validateRequest(authValidation.registerBody)],
    },
    authController.register
  );

  fastify.post(
    "/login",
    {
      preValidation: [validateRequest(authValidation.loginBody)],
    },
    authController.login
  );

  fastify.post(
    "/register-admin",
    {
      preValidation: [
        authenticate,
        authorize(ROLES.SUPERADMIN),
        validateRequest(authValidation.registerAdminBody),
      ],
    },
    authController.registerAdmin
  );

  fastify.get(
    "/me",
    {
      preValidation: [authenticate],
    },
    authController.getMe
  );

  fastify.post(
    "/change-password",
    {
      preValidation: [authenticate, validateRequest(authValidation.changePasswordBody)],
    },
    authController.changePassword
  );

  fastify.patch(
    "/users/:id/role",
    {
      preValidation: [
        authenticate,
        authorize(ROLES.SUPERADMIN),
        validateRequest(authValidation.updateUserRoleParams, "params"),
        validateRequest(authValidation.updateUserRoleBody),
      ],
    },
    authController.updateUserRole
  );

  fastify.post(
    "/verify-email",
    {
      preValidation: [validateRequest(authValidation.verifyEmailBody)],
    },
    authController.verifyEmail
  );


  fastify.post(
  "/resend-email-otp",
  {
    preValidation: [validateRequest(authValidation.resendEmailOtpBody)],
  },
  authController.resendEmailOtp
);


  fastify.post(
    "/forget-password",
    {
      preValidation: [validateRequest(authValidation.forgetPasswordBody)],
    },
    authController.forgotPassword
  );
  
  fastify.post(
    "/reset-password",
    {
      preValidation: [validateRequest(authValidation.resetPasswordBody)],
    },
    authController.resetPassword
  );


  fastify.patch(
  "/me",
  {
    preValidation: [
      authenticate,
      validateRequest(authValidation.updateProfileBody),
    ],
  },
  authController.updateMe
);


}

module.exports = authRoutes;
