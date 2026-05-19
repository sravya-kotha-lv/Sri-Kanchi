const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');
const { ROLES } = require('../../config/constants');

function resolveDb(fastify) {
  if (fastify.db && typeof fastify.db.query === 'function') return fastify.db;
  if (fastify.pg && typeof fastify.pg.query === 'function') return fastify.pg;
  if (fastify.postgres && typeof fastify.postgres.query === 'function') return fastify.postgres;
  if (fastify.pg && fastify.pg.pool && typeof fastify.pg.pool.query === 'function') return fastify.pg.pool;
  throw new Error('PostgreSQL instance not found on Fastify');
}

function resolveAdminPreHandler(fastify) {
  if (typeof fastify.authenticateAdmin === 'function') return [fastify.authenticateAdmin];
  if (typeof fastify.verifyAdmin === 'function') return [fastify.verifyAdmin];
  if (typeof fastify.adminAuth === 'function') return [fastify.adminAuth];
  if (authenticate && authorize) return [authenticate, authorize(ROLES.ADMIN)];
  if (typeof fastify.authenticate === 'function') {
    return [
      fastify.authenticate,
      async function enforceAdminRole(request, reply) {
        const role = request?.user?.role || request?.user?.role_name || null;
        const roles = Array.isArray(request?.user?.roles) ? request.user.roles : [];
        const hasAdminRole =
          role === 'admin' || roles.includes('admin');
        if (!hasAdminRole) {
          return reply.code(403).send({
            success: false,
            message: 'Forbidden: admin access required',
            code: 'FORBIDDEN',
          });
        }
      },
    ];
  }

  if (process.env.ALLOW_UNPROTECTED_ADMIN_ROUTES === 'true') return undefined;
  throw new Error(
    'Admin auth pre-handler is not configured. Set fastify.authenticateAdmin/verifyAdmin/adminAuth or ALLOW_UNPROTECTED_ADMIN_ROUTES=true'
  );
}

module.exports = {
  resolveDb,
  resolveAdminPreHandler,
};
