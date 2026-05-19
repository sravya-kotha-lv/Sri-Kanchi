const categoryController = require("./category.controller");
const categoryValidation = require("./category.validation");
const { validateRequest } = require("../common/utils/request-validation");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { ROLES } = require("../config/constants");

async function categoryRoutes(fastify) {
  fastify.post(
    "/admin/categories",
    {
      preValidation: [
        authenticate,
        authorize(ROLES.ADMIN),
      ],
    },
    categoryController.createCategory
  );

  fastify.get(
    "/admin/categories",
    {
      preValidation: [
        authenticate,
        authorize(ROLES.ADMIN),
        validateRequest(categoryValidation.listCategoriesQuery, "query"),
      ],
    },
    categoryController.listAdminCategories
  );

  fastify.get(
    "/admin/categories/:id",
    {
      preValidation: [
        authenticate,
        authorize(ROLES.ADMIN),
        validateRequest(categoryValidation.categoryParams, "params"),
      ],
    },
    categoryController.getCategoryById
  );

  fastify.patch(
    "/admin/categories/:id",
    {
      preValidation: [
        authenticate,
        authorize(ROLES.ADMIN),
        validateRequest(categoryValidation.categoryParams, "params"),
      ],
    },
    categoryController.updateCategory
  );

  fastify.delete(
    "/admin/categories/:id",
    {
      preValidation: [
        authenticate,
        authorize(ROLES.ADMIN),
        validateRequest(categoryValidation.categoryParams, "params"),
      ],
    },
    categoryController.deleteCategory
  );

  fastify.get(
    "/categories",
    {
      preValidation: [validateRequest(categoryValidation.listCategoriesQuery, "query")],
    },
    categoryController.listPublicCategories
  );

  fastify.get(
    "/categories/:slug",
    {
      preValidation: [validateRequest(categoryValidation.categorySlugParams, "params")],
    },
    categoryController.getCategoryBySlug
  );
}

module.exports = categoryRoutes;
