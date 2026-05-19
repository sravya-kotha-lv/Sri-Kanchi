const { validate } = require("../common/utils/validation");
const { sendSuccess, sendError } = require("../common/utils/response");
const {
  createAddressSchema,
  updateAddressSchema,
  addressParamsSchema,
} = require("./address.validation");

function createAddressController(addressService) {
  return {
    listAddresses: async (request, reply) => {
      try {
        const data = await addressService.listAddresses(request.user.id);

        return sendSuccess(reply, {
          message: "Addresses fetched successfully",
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getAddress: async (request, reply) => {
      try {
        const params = validate(addressParamsSchema, request.params || {});
        const data = await addressService.getAddress(request.user.id, params.id);

        return sendSuccess(reply, {
          message: "Address fetched successfully",
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    createAddress: async (request, reply) => {
      try {
        const payload = validate(createAddressSchema, request.body || {});
        const data = await addressService.createAddress(request.user.id, payload);

        return sendSuccess(reply, {
          statusCode: 201,
          message: "Address created successfully",
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    updateAddress: async (request, reply) => {
      try {
        const params = validate(addressParamsSchema, request.params || {});
        const payload = validate(updateAddressSchema, request.body || {});
        const data = await addressService.updateAddress(
          request.user.id,
          params.id,
          payload
        );

        return sendSuccess(reply, {
          message: "Address updated successfully",
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    setDefaultAddress: async (request, reply) => {
      try {
        const params = validate(addressParamsSchema, request.params || {});
        const data = await addressService.setDefaultAddress(request.user.id, params.id);

        return sendSuccess(reply, {
          message: "Default address updated successfully",
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    deleteAddress: async (request, reply) => {
      try {
        const params = validate(addressParamsSchema, request.params || {});
        const data = await addressService.deleteAddress(request.user.id, params.id);

        return sendSuccess(reply, {
          message: data.message,
          data: null,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },
  };
}

module.exports = {
  createAddressController,
};
