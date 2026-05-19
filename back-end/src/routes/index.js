const env = require("../config/env");
const healthRoutes = require("../health/health.routes");
const authRoutes = require("../auth/auth.routes");
const categoryRoutes = require("../category/category.routes");
const productRoutes = require("../product/product.routes");
const discountRoutes = require("../discount/discount.routes");
const inventoryRoutes = require("../inventory/inventory.routes");
const cartRoutes = require("../cart/cart.routes");
const dashboardRoutes = require("../dashboard/dashboard.routes");
const wishlistRoutes = require("../wishlist/wishlist.routes");
const orderRoutes = require("../order/order.routes");
const ratingRoutes = require("../rating/rating.routes");
const newArrivalsRoutes = require("../new_arrivals/new_arrivals.routes");
const contactRoutes = require("../contact/contact.routes");
const addressRoutes = require("../address/address.routes");


async function registerRoutes(fastify) {
  fastify.register(healthRoutes, {
    prefix: env.apiPrefix,
  });

  fastify.register(authRoutes, {
    prefix: `${env.apiPrefix}/auth`,
  });

  fastify.register(categoryRoutes, {
    prefix: env.apiPrefix,
  });

  fastify.register(productRoutes);
  fastify.register(discountRoutes);
  fastify.register(inventoryRoutes);
  fastify.register(cartRoutes);
  fastify.register(orderRoutes);
  fastify.register(dashboardRoutes);
  fastify.register(wishlistRoutes);
  fastify.register(newArrivalsRoutes);
  fastify.register(contactRoutes);
  fastify.register(ratingRoutes);
  fastify.register(addressRoutes);

}

module.exports = registerRoutes;
