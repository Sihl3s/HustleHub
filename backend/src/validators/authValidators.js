/**
 * Registration and login input rules.
 *
 * Email is normalised, names are escaped, and passwords are length-limited to
 * 72 characters because bcrypt silently truncates beyond that bound
 * (OWASP, 2025c; OWASP, 2025d).
 */

const { body } = require('express-validator');

const ROLES = ['client', 'freelancer', 'admin'];

const registerValidators = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password')
    .isString()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be between 8 and 72 characters'),
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .escape(),
  body('role')
    .isString()
    .isIn(ROLES)
    .withMessage(`Role must be one of: ${ROLES.join(', ')}`),
];

const loginValidators = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password')
    .isString()
    .withMessage('Password is required')
    .notEmpty()
    .withMessage('Password is required'),
];

module.exports = {
  ROLES,
  registerValidators,
  loginValidators,
};
