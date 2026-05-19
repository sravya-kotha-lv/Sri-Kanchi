const env = require("../../config/env");
const AppError = require("../errors/app-error");
const { sendMail } = require("./mail");
const logger = require("./logger");

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const getOtpExpiry = (minutes = 15) => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
};

const buildOtpDeliveryMeta = ({ emailSent, otp, error }) => {
  const meta = { emailSent };

  if (!emailSent && env.nodeEnv !== "production") {
    meta.otpForTesting = otp;
    meta.emailError = error;
  }

  return meta;
};

const sendOtpMail = async ({ to, subject, text, otp, purpose }) => {
  try {
    await sendMail(to, subject, text);
    return {
      message: `${purpose} OTP sent to your email`,
      meta: buildOtpDeliveryMeta({ emailSent: true, otp }),
    };
  } catch (error) {
    logger.error(`Failed to send ${purpose.toLowerCase()} OTP email:`, error.message);

    if (env.nodeEnv === "production") {
      throw new AppError(
        "Unable to send OTP email. Please try again later.",
        502,
        "EMAIL_DELIVERY_FAILED"
      );
    }

    return {
      message:
        `${purpose} OTP generated, but email could not be sent. ` +
        "Use meta.otpForTesting for local testing and fix EMAIL_USER/EMAIL_PASS.",
      meta: buildOtpDeliveryMeta({
        emailSent: false,
        otp,
        error: "Gmail rejected the configured email credentials",
      }),
    };
  }
};

module.exports = {
  generateOtp,
  getOtpExpiry,
  sendOtpMail,
};
