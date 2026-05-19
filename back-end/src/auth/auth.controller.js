const { successResponse } = require("../common/utils/api-response");
const authService = require("./auth.service");

const setAuthHeaders = (reply, token) => {
  if (!token) {
    return;
  }

  reply.header("Authorization", `Bearer ${token}`);

  const exposedHeaders = reply.getHeader("Access-Control-Expose-Headers");
  const headerList = Array.isArray(exposedHeaders)
    ? exposedHeaders.join(",")
    : String(exposedHeaders || "");

  const uniqueHeaders = new Set(
    headerList
      .split(",")
      .map((header) => header.trim())
      .filter(Boolean)
  );

  uniqueHeaders.add("Authorization");
  reply.header("Access-Control-Expose-Headers", Array.from(uniqueHeaders).join(", "));
};

const sendAuthSuccess = (reply, { statusCode, message, result }) => {
  setAuthHeaders(reply, result.token);

  return reply.code(statusCode).send(
    successResponse({
      message: result.message || message,
      data: {
        user: result.user,
      },
      meta: result.meta || null,
    })
  );
};

const register = async (request, reply) => {
  const result = await authService.register(request.body);
  return sendAuthSuccess(reply, {
    statusCode: 201,
    message: "Registration successful",
    result,
  });
};

const login = async (request, reply) => {
  const result = await authService.login(request.body);
  return sendAuthSuccess(reply, {
    statusCode: 200,
    message: "Login successful",
    result,
  });
};

const registerAdmin = async (request, reply) => {
  const result = await authService.registerAdmin(request.body);

  return reply.code(201).send(
    successResponse({
      message: "Admin created successfully",
      data: result,
    })
  );
};

const getMe = async (request, reply) => {
  const result = await authService.getProfile(request.user.id);

  return reply.code(200).send(
    successResponse({
      message: "Profile fetched successfully",
      data: result,
    })
  );
};

const changePassword = async (request, reply) => {
  const payload = {
    currentPassword: request.body.currentPassword || request.body.current_password,
    newPassword: request.body.newPassword || request.body.new_password,
  };

  const result = await authService.changePassword(request.user.id, payload);

  return reply.code(200).send(
    successResponse({
      message: result.message,
    })
  );
};

const updateUserRole = async (request, reply) => {
  const result = await authService.updateUserRole(
    Number(request.params.id),
    request.body.role,
    request.user
  );

  return reply.code(200).send(
    successResponse({
      message: result.message,
      data: result.user,
    })
  );
};


const verifyEmail = async (request, reply) => {
  const result = await authService.verifyEmail(request.body);

  return reply.code(200).send(
    successResponse({
      message: result.message,
    })
  );
};


const resendEmailOtp = async (request, reply) => {
  const result = await authService.resendEmailOtp(request.body);

  return reply.code(200).send(
    successResponse({
      message: result.message,
      meta: result.meta || null,
    })
  );
};


const forgotPassword = async (request, reply) => {
  const result = await authService.forgotPassword(request.body);

  return reply.code(200).send(
    successResponse({
      message: result.message,
      meta: result.meta || null,
    })
  );
};

const resetPassword = async (request, reply) => {
  const result = await authService.resetPassword(request.body);

  return reply.code(200).send(
    successResponse({
      message: result.message,
    })
  );
};

const updateMe = async (request, reply) => {
  const result = await authService.updateProfile(request.user.id, request.body);

  return reply.code(200).send(
    successResponse({
      message: "Profile updated successfully",
      data: result,
    })
  );
};



module.exports = {
  register,
  login,
  registerAdmin,
  getMe,
  changePassword,
  updateUserRole,
  verifyEmail,
  resendEmailOtp,
  forgotPassword,
  resetPassword,
  updateMe
};
