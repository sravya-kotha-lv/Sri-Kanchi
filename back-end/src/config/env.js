const jwtSecret =
  process.env.JWT_SECRET ||
  process.env.JWT_ACCESS_SECRET ||
  process.env.SECRET_KEY ||
  "dev-jwt-secret";

const jwtExpiresIn =
  process.env.JWT_EXPIRES_IN ||
  process.env.JWT_ACCESS_EXPIRES_IN ||
  "7d";

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 5000),
  API_PREFIX: process.env.API_PREFIX || "/api/v1",
  APP_NAME: process.env.APP_NAME || "Backend API",
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: jwtExpiresIn,
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  apiPrefix: process.env.API_PREFIX || "/api/v1",
  appName: process.env.APP_NAME || "Backend API",
  dbHost: process.env.DB_HOST,
  dbPort: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,
  dbName: process.env.DB_NAME,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret,
  jwtExpiresIn,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || "products",
  cloudinaryTimeoutMs: Number(process.env.CLOUDINARY_TIMEOUT_MS || 20000),
};

env.db = env.databaseUrl
  ? {
      connectionString: env.databaseUrl,
    }
  : {
      host: env.dbHost,
      port: env.dbPort,
      user: env.dbUser,
      password: env.dbPassword,
      database: env.dbName,
    };

module.exports = env;
