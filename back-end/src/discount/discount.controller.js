const {
  validate,
  createDiscountSchema,
  updateDiscountSchema,
  idParamsSchema,
  adminListQuerySchema,
  validateCouponSchema,
  activeOffersQuerySchema,
} = require('./discount.validation');
const { sendSuccess, sendError, sendPaginatedSuccess } = require('../common/utils/response');

function createDiscountController(discountService) {
  return {
    createAdminDiscount: async (request, reply) => {
      try {
        const payload = validate(createDiscountSchema, request.body || {});
        const data = await discountService.create(payload);
        return sendSuccess(reply, {
          statusCode: 201,
          message: 'Discount created successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    listAdminDiscounts: async (request, reply) => {
      try {
        const query = validate(adminListQuerySchema, request.query || {});
        const result = await discountService.listAdmin(query);
        return sendPaginatedSuccess(reply, {
          message: 'Discounts fetched successfully',
          items: result.items,
          meta: result.meta,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getAdminDiscountById: async (request, reply) => {
      try {
        const params = validate(idParamsSchema, request.params || {});
        const data = await discountService.getByIdAdmin(params.id);
        return sendSuccess(reply, {
          message: 'Discount fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    updateAdminDiscountById: async (request, reply) => {
      try {
        const params = validate(idParamsSchema, request.params || {});
        const payload = validate(updateDiscountSchema, request.body || {});
        const data = await discountService.updateById(params.id, payload);
        return sendSuccess(reply, {
          message: 'Discount updated successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    deleteAdminDiscountById: async (request, reply) => {
      try {
        const params = validate(idParamsSchema, request.params || {});
        await discountService.deleteById(params.id);
        return sendSuccess(reply, {
          message: 'Discount deleted successfully',
          data: null,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    validateCoupon: async (request, reply) => {
      try {
        const payload = validate(validateCouponSchema, request.body || {});
        const data = await discountService.validateCoupon(payload);
        return sendSuccess(reply, {
          message: 'Coupon validated successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getActiveOffers: async (request, reply) => {
      try {
        const query = validate(activeOffersQuerySchema, request.query || {});
        const result = await discountService.getActiveOffers(query);
        return sendPaginatedSuccess(reply, {
          message: 'Active offers fetched successfully',
          items: result.items,
          meta: result.meta,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },
  };
}

module.exports = {
  createDiscountController,
};
