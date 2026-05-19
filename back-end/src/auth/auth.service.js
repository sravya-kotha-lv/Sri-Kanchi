const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { ROLES } = require("../config/constants");
const AppError = require("../common/errors/app-error");
const authModel = require("./auth.model");
const { generateOtp, getOtpExpiry, sendOtpMail } = require("../common/utils/otp");
const { encryptTokenPayload } = require("../common/utils/token-crypto");


const SALT_ROUNDS = 10;

const normalizeEmail = (email) => email.trim().toLowerCase();
const normalizePhone = (phone) => {
  if (typeof phone !== "string") {
    return null;
  }

  const normalizedPhone = phone.trim();
  return normalizedPhone.length ? normalizedPhone : null;
};

const ensureUserUniqueness = async ({ email, phone }) => {
  const existingEmailUser = await authModel.findUserByEmail(email);

  if (existingEmailUser) {
    throw new AppError("User with this email already exists", 409);
  }

  if (phone) {
    const existingPhoneUser = await authModel.findUserByPhone(phone);

    if (existingPhoneUser) {
      throw new AppError("User with this mobile number already exists", 409);
    }
  }
};

const mapUniqueConstraintError = (error) => {
  if (error?.code !== "23505") {
    return error;
  }

  const details = `${error.constraint || ""} ${error.detail || ""}`.toLowerCase();

  if (details.includes("email")) {
    return new AppError("User with this email already exists", 409);
  }

  if (details.includes("phone")) {
    return new AppError("User with this mobile number already exists", 409);
  }

  return new AppError("Duplicate user details are not allowed", 409);
};

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const sanitizeProfileUser = (user) => {
  const { email, ...profile } = sanitizeUser(user);
  return profile;
};

const generateAccessToken = (user) =>
  jwt.sign(
    {
      data: encryptTokenPayload({
        id: user.id,
        email: user.email,
        role: user.role,
      }),
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );


const buildAuthResult = (user) => ({
  token: generateAccessToken(user),
  user: sanitizeUser(user),
});

const createUserAccount = async ({ name, email, phone, password, role, createUser }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  await ensureUserUniqueness({ email: normalizedEmail, phone: normalizedPhone });

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  let user;

  try {
    user = await createUser({
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role,
    });
  } catch (error) {
    throw mapUniqueConstraintError(error);
  }

  return user;
};

const sendEmailVerificationOtp = async (user) => {
  const otp = generateOtp();
  const expiresAt = getOtpExpiry();

  await authModel.setEmailVerificationOtp(user.email, otp, expiresAt);

  return sendOtpMail({
    to: user.email,
    subject: "Verify your email",
    text: `Your OTP is ${otp}. It expires in 15 minutes.`,
    otp,
    purpose: "Email verification",
  });
};

const sendPasswordResetOtp = async (user) => {
  const otp = generateOtp();
  const expiresAt = getOtpExpiry();

  await authModel.setPasswordResetOtp(user.email, otp, expiresAt);

  return sendOtpMail({
    to: user.email,
    subject: "Password reset OTP",
    text: `Your password reset OTP is ${otp}. It expires in 15 minutes.`,
    otp,
    purpose: "Password reset",
  });
};

const register = async ({ name, email, phone, password }) => {
  const user = await createUserAccount({
    name,
    email,
    phone,
    password,
    role: ROLES.USER,
    createUser: authModel.createUser,
  });

  const otpDelivery = await sendEmailVerificationOtp(user);

  return {
    ...buildAuthResult(user),
    message: `Registration successful. ${otpDelivery.message}`,
    meta: otpDelivery.meta,
  };
};

const verifyEmail = async ({ email, otp }) => {
  const record = await authModel.findEmailVerificationRecord(email);

  if (!record) {
    throw new AppError("Invalid email or OTP", 400);
  }

  if (record.isEmailVerified) {
    throw new AppError("Email is already verified", 400);
  }

  if (record.emailVerificationOtp !== otp) {
    throw new AppError("Invalid OTP", 400);
  }

  if (new Date(record.emailVerificationOtpExpiresAt) < new Date()) {
    throw new AppError("OTP has expired", 400);
  }

  await authModel.markEmailVerified(email);

  return {
    message: "Email verified successfully",
  };
};

const forgotPassword = async ({ email }) => {
  const user = await authModel.findUserByEmail(normalizeEmail(email));

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const otpDelivery = await sendPasswordResetOtp(user);

  return {
    message: otpDelivery.message,
    meta: otpDelivery.meta,
  };
};



const resendEmailOtp = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await authModel.findUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.isEmailVerified) {
    throw new AppError("Email is already verified", 400);
  }

  const otpDelivery = await sendEmailVerificationOtp(user);

  return {
    message: otpDelivery.message,
    meta: otpDelivery.meta,
  };
};


const resetPassword = async ({ email, otp, newPassword }) => {
  const user = await authModel.findUserByEmail(normalizeEmail(email));

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const record = await authModel.findPasswordResetRecord(email);

  if (!record || record.passwordResetOtp !== otp) {
    throw new AppError("Invalid OTP", 400);
  }

  if (new Date(record.passwordResetOtpExpiresAt) < new Date()) {
    throw new AppError("OTP has expired", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await authModel.updatePassword(user.id, passwordHash);
  await authModel.clearPasswordResetOtp(email);

  return {
    message: "Password reset successfully",
  };
};

const login = async ({ email, password }) => {
  const user = await authModel.findUserByEmail(normalizeEmail(email));

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isEmailVerified) {
    throw new AppError(
      "Email not verified. Please verify the OTP sent to your email.",
      401
    );
  }

  if (!user.isActive) {
    throw new AppError("User account is inactive", 403);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  await authModel.updateLastLogin(user.id);

  return buildAuthResult(user);
};

const registerAdmin = async ({ name, email, phone, password, role }) => {
  const user = await createUserAccount({
    name,
    email,
    phone,
    password,
    role: role || ROLES.ADMIN,
    createUser: authModel.createAdminUser,
  });

  return sanitizeUser(user);
};

const getProfile = async (userId) => {
  const user = await authModel.findUserById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return sanitizeProfileUser(user);
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await authModel.findUserById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isCurrentPasswordValid) {
    throw new AppError("Current password is incorrect", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await authModel.updatePassword(userId, passwordHash);

  return {
    message: "Password changed successfully",
  };
};

const updateUserRole = async (targetUserId, role, currentUser) => {
  const user = await authModel.findUserById(targetUserId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.id === currentUser.id && role !== user.role) {
    throw new AppError("You cannot change your own role", 400);
  }

  if (user.role === role) {
    return {
      message: "User already has this role",
      user: sanitizeUser(user),
    };
  }

  const updatedUser = await authModel.updateUserRole(targetUserId, role);

  return {
    message: "User role updated successfully",
    user: sanitizeUser(updatedUser),
  };

};


  const updateProfile = async (userId, payload) => {
  const user = await authModel.findUserById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const phone = normalizePhone(payload.phone);

  if (phone && phone !== user.phone) {
    const existingPhoneUser = await authModel.findUserByPhone(phone);

    if (existingPhoneUser && existingPhoneUser.id !== userId) {
      throw new AppError("User with this mobile number already exists", 409);
    }
  }

  const updatedUser = await authModel.updateProfile(userId, {
    name: payload.name,
    phone,
  });

  return sanitizeProfileUser(updatedUser);
};



module.exports = {
  register,
  login,
  registerAdmin,
  getProfile,
  changePassword,
  updateUserRole,
  updateProfile,
  verifyEmail,
  resendEmailOtp,
  forgotPassword,
  resetPassword,
};
