/**
 * Registration and login routes. The auth rate limiter runs first, then
 * validation; the handlers live in authController (OWASP, 2025a; OWASP, 2025d).
 */

const express = require('express');
const { rejectUnknownFields, validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');
const { registerValidators, loginValidators } = require('../validators/authValidators');
const { register, login } = require('../controllers/authController');

const router = express.Router();

router.use(authLimiter);

router.post(
  '/register',
  rejectUnknownFields(['email', 'password', 'fullName', 'role']),
  registerValidators,
  validate,
  register
);

router.post(
  '/login',
  rejectUnknownFields(['email', 'password']),
  loginValidators,
  validate,
  login
);

module.exports = router;
