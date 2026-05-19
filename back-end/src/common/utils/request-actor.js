const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');

const GUEST_CART_COOKIE = 'guest_cart_id';

const { decryptTokenPayload } = require("./token-crypto");


function normalizeGuestToken(value) {
  if (Array.isArray(value)) {
    value = value[0];
  }

  if (typeof value !== 'string') {
    return null;
  }

  const token = value.trim();

  if (!token || token.length > 100) {
    return null;
  }

  return token;
}

function parseCookies(cookieHeader) {
  if (typeof cookieHeader !== 'string' || !cookieHeader.trim()) {
    return {};
  }

  return cookieHeader.split(';').reduce((cookies, part) => {
    const [rawKey, ...rawValue] = part.split('=');
    const key = rawKey?.trim();

    if (!key) {
      return cookies;
    }

    cookies[key] = rawValue.join('=').trim();
    return cookies;
  }, {});
}

function resolveAuthenticatedUserId(request) {
  if (request.user?.id) {
    return request.user.id;
  }

  const authHeader = request.headers?.authorization;
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  try {
   const payload = jwt.verify(token, env.jwtSecret);
const user = decryptTokenPayload(payload.data);
return user?.id || null;

  } catch (error) {
    return null;
  }
}

function resolveRequestActor(request) {
  const cookies = parseCookies(request.headers.cookie);
  const guestToken = normalizeGuestToken(cookies[GUEST_CART_COOKIE]);
  const userId = resolveAuthenticatedUserId(request);

  if (userId) {
    return {
      type: 'user',
      userId,
      guestToken,
    };
  }

  return {
    type: 'guest',
    userId: null,
    guestToken: guestToken || crypto.randomUUID(),
  };
}

function applyActorResponseHeaders(reply, actor) {
  if (actor?.type === 'guest' && actor.guestToken) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieParts = [
      `${GUEST_CART_COOKIE}=${actor.guestToken}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=2592000',
    ];

    if (isProduction) {
      cookieParts.push('Secure');
    }

    reply.header('Set-Cookie', cookieParts.join('; '));
  }
}

module.exports = {
  GUEST_CART_COOKIE,
  resolveRequestActor,
  applyActorResponseHeaders,
};
