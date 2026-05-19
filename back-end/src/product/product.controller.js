const {
  validate,
  createProductSchema,
  updateProductSchema,
  idParamsSchema,
  slugParamsSchema,
  imageParamsSchema,
  adminListQuerySchema,
  publicListQuerySchema,
  publicFiltersQuerySchema,
  searchSuggestionsQuerySchema,
  createProductImageSchema,
  updateProductImageSchema,
} = require('./product.validation');
const { sendSuccess, sendError, sendPaginatedSuccess } = require('../common/utils/response');
const cloudinary = require('../config/cloudinary');
const AppError = require('../common/errors/app-error');

function coerceMultipartValue(value) {
  if (value === undefined || value === null) return value;
  if (value === '') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  return value;
}

function buildAltText(filename, fallback) {
  const source = String(filename || fallback || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  return source || null;
}

async function uploadProductImage(file, index = 0) {
  cloudinary.assertCloudinaryConfigured();

  const buffer = await file.toBuffer();
  const fileData = `data:${file.mimetype};base64,${buffer.toString('base64')}`;
  const result = await cloudinary.uploadImage({
    file_data: fileData,
    file_name: file.filename,
    folder: 'products',
    context: buildAltText(file.filename, `product image ${index + 1}`)
      ? { alt: buildAltText(file.filename, `product image ${index + 1}`) }
      : {},
  });

  return {
    upload_url: cloudinary.buildOptimizedUrl(result.secure_url),
    alt_text: buildAltText(file.filename, `Product image ${index + 1}`),
    is_primary: index === 0,
    sort_order: index,
  };
}

async function readAdminProductPayload(request) {
  if (!request.isMultipart()) {
    return request.body || {};
  }

  const payload = {};
  const images = [];

  for await (const part of request.parts()) {
    if (part.type === 'file') {
      if (!part.file) {
        throw new AppError('Invalid file upload', 400, 'INVALID_FILE_UPLOAD');
      }
      if (part.fieldname === 'images') {
        images.push(await uploadProductImage(part, images.length));
      }
      continue;
    }

    payload[part.fieldname] = coerceMultipartValue(part.value);
  }

  payload.images = images;
  return payload;
}

function createProductController(productService) {
  return {
    createAdminProduct: async (request, reply) => {
      try {
        const rawPayload = await readAdminProductPayload(request);
        const payload = validate(createProductSchema, rawPayload);
        const data = await productService.create(payload);
        return sendSuccess(reply, {
          statusCode: 201,
          message: 'Product created successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    listAdminProducts: async (request, reply) => {
      try {
        const query = validate(adminListQuerySchema, request.query || {});
        const result = await productService.listAdmin(query);
        return sendPaginatedSuccess(reply, {
          message: 'Products fetched successfully',
          items: result.items,
          meta: result.meta,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getAdminProductById: async (request, reply) => {
      try {
        const params = validate(idParamsSchema, request.params || {});
        const data = await productService.getByIdAdmin(params.id);
        return sendSuccess(reply, {
          message: 'Product fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    updateAdminProductById: async (request, reply) => {
      try {
        const params = validate(idParamsSchema, request.params || {});
        const rawPayload = await readAdminProductPayload(request);
        const payload = validate(updateProductSchema, rawPayload);
        const data = await productService.updateById(params.id, payload);
        return sendSuccess(reply, {
          message: 'Product updated successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    deleteAdminProductById: async (request, reply) => {
      try {
        const params = validate(idParamsSchema, request.params || {});
        await productService.deleteById(params.id);
        return sendSuccess(reply, {
          message: 'Product deactivated successfully',
          data: null,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    addAdminProductImage: async (request, reply) => {
      try {
        const params = validate(idParamsSchema, request.params || {});
        const rawPayload = await readAdminProductPayload(request);
        const imagePayload = rawPayload.images?.[0] || rawPayload;
        const payload = validate(createProductImageSchema, imagePayload);
        const data = await productService.addProductImage(params.id, payload);
        return sendSuccess(reply, {
          statusCode: 201,
          message: 'Product image added successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    listAdminProductImages: async (request, reply) => {
      try {
        const params = validate(idParamsSchema, request.params || {});
        const data = await productService.listProductImages(params.id);
        return sendSuccess(reply, {
          message: 'Product images fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    updateAdminProductImage: async (request, reply) => {
      try {
        const params = validate(imageParamsSchema, request.params || {});
        const payload = validate(updateProductImageSchema, request.body || {});
        const data = await productService.updateProductImage(params.id, params.imageId, payload);
        return sendSuccess(reply, {
          message: 'Product image updated successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    deleteAdminProductImage: async (request, reply) => {
      try {
        const params = validate(imageParamsSchema, request.params || {});
        await productService.deleteProductImage(params.id, params.imageId);
        return sendSuccess(reply, {
          message: 'Product image deleted successfully',
          data: null,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    listPublicProducts: async (request, reply) => {
      try {
        const query = validate(publicListQuerySchema, request.query || {});
        const result = await productService.listPublic(query);
        return sendPaginatedSuccess(reply, {
          message: 'Products fetched successfully',
          items: result.items,
          meta: result.meta,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getPublicProductFilters: async (request, reply) => {
      try {
        const query = validate(publicFiltersQuerySchema, request.query || {});
        const data = await productService.getPublicFilters(query);
        return sendSuccess(reply, {
          message: 'Product filters fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getPublicSearchSuggestions: async (request, reply) => {
      try {
        const query = validate(searchSuggestionsQuerySchema, request.query || {});
        const data = await productService.getSearchSuggestions(query);
        return sendSuccess(reply, {
          message: 'Search suggestions fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getAdminSearchSuggestions: async (request, reply) => {
      try {
        const query = validate(searchSuggestionsQuerySchema, request.query || {});
        const data = await productService.getAdminSearchSuggestions(query);
        return sendSuccess(reply, {
          message: 'Admin search suggestions fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },

    getPublicProductBySlug: async (request, reply) => {
      try {
        const params = validate(slugParamsSchema, request.params || {});
        const data = await productService.getBySlugPublic(params.slug);
        return sendSuccess(reply, {
          message: 'Product fetched successfully',
          data,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },
  };
}

module.exports = {
  createProductController,
};
