/**
 * Role-based access control (RBAC).
 *
 * Must run after authenticate(). The role comes from the verified JWT, never
 * from the request body (OWASP, 2025a).
 */

const { AppError } = require('../utils/appError');
const { logEvent } = require('../utils/logger');

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logEvent('info', 'rbac_denied', {
        userId: req.user.id,
        role: req.user.role,
        path: req.path,
      });
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    return next();
  };
}

module.exports = { requireRole };
