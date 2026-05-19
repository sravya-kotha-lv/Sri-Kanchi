const Fastify = require("fastify");
const cors = require("@fastify/cors");
const multipart = require("@fastify/multipart");
const registerErrorHandler = require("./plugins/error-handler");
const registerNotFoundHandler = require("./plugins/not-found-handler");
const registerRoutes = require("./routes");

const getCorsOrigins = () =>
  (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const buildApp = () => {
  const logsEnabled = process.env.LOGS_ENABLED !== 'false';
  const app = Fastify({
    logger: logsEnabled,
  });

  const corsOrigins = getCorsOrigins();

  app.register(cors, {
    origin: (origin, callback) => {
      const allowAllOrigins =
        corsOrigins.length === 0 || corsOrigins.includes("*");

      if (!origin || allowAllOrigins || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
    credentials: true,
  });

  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 5,
    },
  });

  registerErrorHandler(app);
  registerNotFoundHandler(app);
  registerRoutes(app);

  return app;
};

module.exports = buildApp;
