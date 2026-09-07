/**
 * Registration and login routes.
 *
 * These handlers perform validation, issue JWTs, and never persist plain-text
 * passwords. Hashing uses bcrypt and users are stored in a local JSON file
 * (OWASP, 2025a; OWASP, 2025d).
 */

const express = require('express');
const { rejectUnknownFields, validate } = require('../middleware/validate');
const { registerValidators, loginValidators } = require('../validators/authValidators');
const { register, login } = require('../controllers/authController');

const router = express.Router();

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
