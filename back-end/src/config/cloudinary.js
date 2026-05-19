const crypto = require('crypto');
const https = require('https');
const env = require('./env');
const AppError = require('../common/errors/app-error');

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const ALLOWED_REMOTE_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function assertCloudinaryConfigured() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new AppError('Cloudinary configuration is missing', 500, 'CLOUDINARY_CONFIG_MISSING');
  }
}

function parseDataUri(fileData) {
  const match = String(fileData || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    throw new AppError(
      'file_data must be a valid base64 image data URI',
      400,
      'INVALID_IMAGE_DATA'
    );
  }

  const mimeType = match[1].toLowerCase();
  const base64Payload = match[2].replace(/\s/g, '');

  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new AppError(
      'Only JPG, JPEG, PNG, and WEBP images are allowed',
      400,
      'UNSUPPORTED_IMAGE_TYPE'
    );
  }

  const sizeInBytes = Buffer.byteLength(base64Payload, 'base64');
  if (sizeInBytes > MAX_IMAGE_SIZE_BYTES) {
    throw new AppError('Image size must be 10MB or less', 400, 'IMAGE_TOO_LARGE');
  }

  return {
    sourceType: 'base64',
    mimeType,
    sizeInBytes,
  };
}

function parseRemoteImageUrl(fileData) {
  let url = null;

  try {
    url = new URL(String(fileData || ''));
  } catch (error) {
    throw new AppError(
      'file_data must be a valid base64 image data URI or image URL',
      400,
      'INVALID_IMAGE_DATA'
    );
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new AppError(
      'Only http and https image URLs are allowed',
      400,
      'UNSUPPORTED_IMAGE_SOURCE'
    );
  }

  const pathname = url.pathname.toLowerCase();
  const hasAllowedExtension = Array.from(ALLOWED_REMOTE_IMAGE_EXTENSIONS).some((extension) =>
    pathname.endsWith(extension)
  );

  if (!hasAllowedExtension) {
    throw new AppError(
      'Remote image URL must end with .jpg, .jpeg, .png, or .webp',
      400,
      'UNSUPPORTED_IMAGE_TYPE'
    );
  }

  return {
    sourceType: 'remote_url',
    url: url.toString(),
  };
}

function parseImageInput(fileData) {
  const value = String(fileData || '').trim();
  if (value.startsWith('data:image/')) {
    return parseDataUri(value);
  }

  return parseRemoteImageUrl(value);
}

function buildOptimizedUrl(url) {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto,c_limit,w_1600/');
}

async function requestJson({ method, path, body, auth }) {
  const options = {
    hostname: 'api.cloudinary.com',
    port: 443,
    method,
    path,
    headers: {},
    timeout: env.cloudinaryTimeoutMs,
  };

  let payload = null;
  if (body) {
    payload = typeof body === 'string' ? body : JSON.stringify(body);
    options.headers['Content-Length'] = Buffer.byteLength(payload);
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  if (auth) {
    options.headers.Authorization = `Basic ${Buffer.from(auth).toString('base64')}`;
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const safeReject = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const safeResolve = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const request = https.request(options, (response) => {
      const chunks = [];

      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed = null;

        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch (error) {
          safeReject(new AppError('Invalid response from Cloudinary', 502, 'CLOUDINARY_INVALID_RESPONSE'));
          return;
        }

        if (response.statusCode >= 400) {
          const message = parsed?.error?.message || parsed?.message || 'Cloudinary request failed';
          safeReject(new AppError(message, 502, 'CLOUDINARY_REQUEST_FAILED'));
          return;
        }

        safeResolve(parsed);
      });
    });

    request.on('error', () => {
      safeReject(new AppError('Unable to connect to Cloudinary', 502, 'CLOUDINARY_CONNECTION_FAILED'));
    });

    request.on('timeout', () => {
      request.destroy();
      safeReject(
        new AppError(
          `Cloudinary upload timed out after ${Math.ceil(env.cloudinaryTimeoutMs / 1000)} seconds`,
          504,
          'CLOUDINARY_TIMEOUT'
        )
      );
    });

    if (payload) {
      request.write(payload);
    }

    request.end();
  });
}

function buildSignature(params = {}) {
  assertCloudinaryConfigured();

  const signatureBase = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${signatureBase}${env.cloudinaryApiSecret}`)
    .digest('hex');
}

async function uploadImage(payload = {}) {
  assertCloudinaryConfigured();
  parseImageInput(payload.file_data);

  const params = {
    file: payload.file_data,
    api_key: env.cloudinaryApiKey,
    timestamp: Math.floor(Date.now() / 1000),
    folder: payload.folder || env.cloudinaryFolder,
  };

  if (payload.upload_preset || env.cloudinaryUploadPreset) {
    params.upload_preset = payload.upload_preset || env.cloudinaryUploadPreset;
  }

  if (payload.public_id) {
    params.public_id = payload.public_id;
  }

  if (payload.tags?.length) {
    params.tags = payload.tags.join(',');
  }

  if (payload.context && Object.keys(payload.context).length) {
    params.context = Object.entries(payload.context)
      .map(([key, value]) => `${key}=${value ?? ''}`)
      .join('|');
  }

  params.signature = buildSignature(
    Object.keys(params)
      .filter((key) => !['file', 'api_key'].includes(key))
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {})
  );

  return requestJson({
    method: 'POST',
    path: `/v1_1/${encodeURIComponent(env.cloudinaryCloudName)}/image/upload`,
    body: new URLSearchParams(params).toString(),
  });
}

async function listAssets(query = {}) {
  assertCloudinaryConfigured();

  const folder = query.folder || env.cloudinaryFolder;
  const params = new URLSearchParams({
    type: 'upload',
    max_results: String(query.max_results || 30),
    prefix: query.prefix || folder,
  });

  if (query.next_cursor) {
    params.set('next_cursor', query.next_cursor);
  }

  return requestJson({
    method: 'GET',
    path: `/v1_1/${encodeURIComponent(env.cloudinaryCloudName)}/resources/image?${params.toString()}`,
    auth: `${env.cloudinaryApiKey}:${env.cloudinaryApiSecret}`,
  });
}

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_REMOTE_IMAGE_EXTENSIONS,
  MAX_IMAGE_SIZE_BYTES,
  assertCloudinaryConfigured,
  parseDataUri,
  parseRemoteImageUrl,
  parseImageInput,
  buildSignature,
  buildOptimizedUrl,
  uploadImage,
  listAssets,
};
