require("dotenv").config();

const buildApp = require("./src/app");
const { connectDB } = require("./src/config/db");
const swaggerDoc = require("./src/swagger");

const startServer = async () => {
  const app = buildApp();

  try {
    await connectDB();


//     await app.register(require("@fastify/cors"), {
//   origin:
//     process.env.CORS_ORIGINS === "*"
//       ? true
//       : process.env.CORS_ORIGINS?.split(","),
//   methods: ["GET", "POST", "PUT", "DELETE"],
// });

    await app.register(require("@fastify/swagger"), {
      mode: "static",
      specification: {
        document: swaggerDoc,
      },
    });

    await app.register(require("@fastify/swagger-ui"), {
      routePrefix: "/swagger",
    });

    app.get("/", async () => {
      return { message: "API running successfully" };
    });

    const PORT = process.env.PORT || 5000;
    console.log(PORT);

    await app.listen({ port: PORT });

    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Swagger running on http://localhost:${PORT}/swagger`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

startServer();
