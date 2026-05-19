let db;

try {
  db = require("../config/db");
} catch (error) {
  db = require("../db/postgres");
}

const runQuery = async (text, params = []) => {
  if (typeof db.query === "function") {
    return db.query(text, params);
  }

  if (db.pool && typeof db.pool.query === "function") {
    return db.pool.query(text, params);
  }

  if (db.sequelize && typeof db.sequelize.query === "function") {
    const [rows] = await db.sequelize.query(text, {
      bind: params,
    });

    return { rows };
  }

  throw new Error("Database client is not configured correctly");
};

const normalizeUser = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    passwordHash: row.password_hash,
    role: row.role,
    isActive: row.is_active,
    isEmailVerified: row.is_email_verified,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const findUserByEmail = async (email) => {
  const query = `
    SELECT id, name, email, phone, password_hash, role, is_active, is_email_verified, last_login_at, created_at, updated_at
    FROM users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
  `;
  const { rows } = await runQuery(query, [email]);
  return normalizeUser(rows[0]);
};

const findUserByPhone = async (phone) => {
  const query = `
    SELECT id, name, email, phone, password_hash, role, is_active, is_email_verified, last_login_at, created_at, updated_at
    FROM users
    WHERE phone = $1
    LIMIT 1
  `;
  const { rows } = await runQuery(query, [phone]);
  return normalizeUser(rows[0]);
};

const findUserById = async (id) => {
  const query = `
    SELECT id, name, email, phone, password_hash, role, is_active, is_email_verified, last_login_at, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
  `;
  const { rows } = await runQuery(query, [id]);
  return normalizeUser(rows[0]);
};

const createAdminUser = async ({ name, email, phone, passwordHash, role }) => {
  const query = `
    INSERT INTO users (name, email, phone, password_hash, role, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
    RETURNING id, name, email, phone, password_hash, role, is_active, is_email_verified, last_login_at, created_at, updated_at
  `;

  const { rows } = await runQuery(query, [name, email, phone || null, passwordHash, role]);
  return normalizeUser(rows[0]);
};

const createUser = async ({ name, email, phone, passwordHash, role }) =>
  createAdminUser({ name, email, phone, passwordHash, role });

const updatePassword = async (id, passwordHash) => {
  const query = `
    UPDATE users
    SET password_hash = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING id, updated_at
  `;
  const { rows } = await runQuery(query, [id, passwordHash]);
  return rows[0] || null;
};

const updateLastLogin = async (id) => {
  const query = `
    UPDATE users
    SET last_login_at = NOW(), updated_at = NOW()
    WHERE id = $1
    RETURNING id, last_login_at
  `;
  const { rows } = await runQuery(query, [id]);
  return rows[0] || null;
};

const updateUserRole = async (id, role) => {
  const query = `
    UPDATE users
    SET role = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING id, name, email, phone, password_hash, role, is_active, is_email_verified, last_login_at, created_at, updated_at
  `;
  const { rows } = await runQuery(query, [id, role]);
  return normalizeUser(rows[0]);
};


const setEmailVerificationOtp = async (email, otp, expiresAt) => {
  const query = `
    UPDATE users
    SET email_verification_otp = $2,
        email_verification_otp_expires_at = $3,
        updated_at = NOW()
    WHERE LOWER(email) = LOWER($1)
    RETURNING id
  `;
  const { rows } = await runQuery(query, [email, otp, expiresAt]);
  return rows[0] || null;
};

const findEmailVerificationRecord = async (email) => {
  const query = `
    SELECT id, email, is_email_verified, email_verification_otp, email_verification_otp_expires_at
    FROM users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
  `;
  const { rows } = await runQuery(query, [email]);
  const record = rows[0];

  if (!record) {
    return null;
  }

  return {
    id: record.id,
    email: record.email,
    isEmailVerified: record.is_email_verified,
    emailVerificationOtp: record.email_verification_otp,
    emailVerificationOtpExpiresAt: record.email_verification_otp_expires_at,
  };
};

const markEmailVerified = async (email) => {
  const query = `
    UPDATE users
    SET is_email_verified = TRUE,
        email_verification_otp = NULL,
        email_verification_otp_expires_at = NULL,
        updated_at = NOW()
    WHERE LOWER(email) = LOWER($1)
    RETURNING id
  `;
  const { rows } = await runQuery(query, [email]);
  return rows[0] || null;
};

const setPasswordResetOtp = async (email, otp, expiresAt) => {
  const query = `
    UPDATE users
    SET password_reset_otp = $2,
        password_reset_otp_expires_at = $3,
        updated_at = NOW()
    WHERE LOWER(email) = LOWER($1)
    RETURNING id
  `;
  const { rows } = await runQuery(query, [email, otp, expiresAt]);
  return rows[0] || null;
};

const findPasswordResetRecord = async (email) => {
  const query = `
    SELECT id, email, password_reset_otp, password_reset_otp_expires_at
    FROM users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
  `;
  const { rows } = await runQuery(query, [email]);
  const record = rows[0];

  if (!record) {
    return null;
  }

  return {
    id: record.id,
    email: record.email,
    passwordResetOtp: record.password_reset_otp,
    passwordResetOtpExpiresAt: record.password_reset_otp_expires_at,
  };
};

const clearPasswordResetOtp = async (email) => {
  const query = `
    UPDATE users
    SET password_reset_otp = NULL,
        password_reset_otp_expires_at = NULL,
        updated_at = NOW()
    WHERE LOWER(email) = LOWER($1)
    RETURNING id
  `;
  const { rows } = await runQuery(query, [email]);
  return rows[0] || null;
};


const updateProfile = async (id, { name, phone }) => {
  const query = `
    UPDATE users
    SET
      name = COALESCE($2, name),
      phone = COALESCE($3, phone),
      updated_at = NOW()
    WHERE id = $1
    RETURNING id, name, email, phone, password_hash, role, is_active, is_email_verified, last_login_at, created_at, updated_at
  `;

  const { rows } = await runQuery(query, [id, name, phone]);
  return normalizeUser(rows[0]);
};


module.exports = {
  findUserByEmail,
  findUserByPhone,
  findUserById,
  createUser,
  createAdminUser,
  updatePassword,
  updateLastLogin,
  updateUserRole,
  setEmailVerificationOtp,
  findEmailVerificationRecord,
  markEmailVerified,
  setPasswordResetOtp,
  findPasswordResetRecord,
  clearPasswordResetOtp,
  updateProfile
};
