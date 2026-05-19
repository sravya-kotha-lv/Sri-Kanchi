const {
  validate,
  productIdParamsSchema,
  adminInventoryListQuerySchema,
  patchInventorySchema,
  adjustInventorySchema,
  lowStockQuerySchema,
} = require('./inventory.validation');
const { sendSuccess, sendError, sendPaginatedSuccess } = require('../common/utils/response');

function createInventoryController(inventoryService) {
  return {
    listAdminInventory: async (request, reply) => {
      try {
        const query = validate(adminInventoryListQuerySchema, request.query || {});
        const result = await inventoryService.listAdmin(query);
        return sendPaginatedSuccess(reply, {
          message: 'Inventory list fetched successfully',
          items: result.items,
          meta: result.meta,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getAdminInventoryByProductId: async (request, reply) => {
      try {
        const params = validate(productIdParamsSchema, request.params || {});
        const data = await inventoryService.getByProductId(params.productId);
        return sendSuccess(reply, {
          message: 'Inventory fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    patchAdminInventoryByProductId: async (request, reply) => {
      try {
        const params = validate(productIdParamsSchema, request.params || {});
        const payload = validate(patchInventorySchema, request.body || {});
        const data = await inventoryService.patchByProductId(params.productId, payload);
        return sendSuccess(reply, {
          message: 'Inventory updated successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    adjustAdminInventory: async (request, reply) => {
      try {
        const payload = validate(adjustInventorySchema, request.body || {});
        const data = await inventoryService.adjustStock(payload);
        return sendSuccess(reply, {
          message: 'Inventory adjusted successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    listAdminLowStockInventory: async (request, reply) => {
      try {
        const query = validate(lowStockQuerySchema, request.query || {});
        const result = await inventoryService.listLowStock(query);
        return sendPaginatedSuccess(reply, {
          message: 'Low stock inventory fetched successfully',
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
  createInventoryController,
};
