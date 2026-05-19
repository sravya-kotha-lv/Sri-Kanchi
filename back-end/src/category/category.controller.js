const { successResponse, errorResponse } = require("../common/utils/api-response");
const { validate } = require("../common/utils/validation");
const { createCategoryBody, updateCategoryBody } = require("./category.validation");
const categoryService = require("./category.service");
const cloudinary = require("../config/cloudinary");
const AppError = require("../common/errors/app-error");

function coerceMultipartValue(value) {
  if (value === undefined || value === null) return value;
  if (value === "") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  return value;
}

function buildAltText(filename, fallback) {
  const source = String(filename || fallback || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();

  return source || null;
}

async function uploadCategoryImage(file) {
  if (!file) return null;

  cloudinary.assertCloudinaryConfigured();

  const buffer = await file.toBuffer();
  const fileData = `data:${file.mimetype};base64,${buffer.toString("base64")}`;
  const result = await cloudinary.uploadImage({
    file_data: fileData,
    file_name: file.filename,
    folder: "categories",
    context: buildAltText(file.filename, "category image")
      ? { alt: buildAltText(file.filename, "category image") }
      : {},
  });

  return cloudinary.buildOptimizedUrl(result.secure_url);
}

async function readCategoryPayload(request) {
  if (!request.isMultipart()) {
    return request.body || {};
  }

  const payload = {};

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (!part.file) {
        throw new AppError("Invalid file upload", 400, "INVALID_FILE_UPLOAD");
      }
      if (part.fieldname === "image") {
        payload.image_url = await uploadCategoryImage(part);
      }
      continue;
    }

    payload[part.fieldname] = coerceMultipartValue(part.value);
  }

  return payload;
}

function sendControllerError(reply, error) {
  return reply.code(error.statusCode || 500).send(
    errorResponse({
      message: error.message || "Internal server error",
      errors: error.details || null,
    })
  );
}

const createCategory = async (request, reply) => {
  try {
    const rawPayload = await readCategoryPayload(request);
    const payload = validate(createCategoryBody, rawPayload);
    const category = await categoryService.createCategory(payload);

    return reply.code(201).send(
      successResponse({
        message: "Category created successfully",
        data: category,
      })
    );
  } catch (error) {
    return sendControllerError(reply, error);
  }
};

const listAdminCategories = async (request, reply) => {
  const result = await categoryService.listAdminCategories(request.query);

  return reply.code(200).send(
    successResponse({
      message: "Categories fetched successfully",
      data: result.categories,
      meta: result.meta,
    })
  );
};

const getCategoryById = async (request, reply) => {
  const category = await categoryService.getCategoryById(request.params.id);

  return reply.code(200).send(
    successResponse({
      message: "Category fetched successfully",
      data: category,
    })
  );
};

const updateCategory = async (request, reply) => {
  try {
    const rawPayload = await readCategoryPayload(request);
    const payload = validate(updateCategoryBody, rawPayload);
    const category = await categoryService.updateCategory(request.params.id, payload);

    return reply.code(200).send(
      successResponse({
        message: "Category updated successfully",
        data: category,
      })
    );
  } catch (error) {
    return sendControllerError(reply, error);
  }
};

const deleteCategory = async (request, reply) => {
  const category = await categoryService.deleteCategory(request.params.id);

  return reply.code(200).send(
    successResponse({
      message: "Category deactivated successfully",
      data: category,
    })
  );
};

const permanentlyDeleteCategory = async (request, reply) => {
  const category = await categoryService.permanentlyDeleteCategory(request.params.id);

  return reply.code(200).send(
    successResponse({
      message: "Category permanently deleted successfully",
      data: category,
    })
  );
};

const listPublicCategories = async (request, reply) => {
  const result = await categoryService.listPublicCategories(request.query);

  return reply.code(200).send(
    successResponse({
      message: "Public categories fetched successfully",
      data: result.categories,
      meta: result.meta,
    })
  );
};

const getCategoryBySlug = async (request, reply) => {
  const category = await categoryService.getCategoryBySlug(request.params.slug);

  return reply.code(200).send(
    successResponse({
      message: "Category fetched successfully",
      data: category,
    })
  );
};

module.exports = {
  createCategory,
  listAdminCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  permanentlyDeleteCategory,
  listPublicCategories,
  getCategoryBySlug,
};
