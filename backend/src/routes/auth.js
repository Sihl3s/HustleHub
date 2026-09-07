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
const { hashPassword, verifyPassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');
const { findByEmail, createUser } = require('../models/userStore');
const { AppError } = require('../utils/appError');
const { logEvent } = require('../utils/logger');

const router = express.Router();

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

router.post(
  '/register',
  rejectUnknownFields(['email', 'password', 'fullName', 'role']),
  registerValidators,
  validate,
  async (req, res, next) => {
    try {
      const { email, password, fullName, role } = req.body;

      const existing = await findByEmail(email);
      if (existing) {
        logEvent('info', 'register_duplicate_email');
        throw new AppError('An account with this email already exists', 409);
      }

      const passwordHash = await hashPassword(password);
      const user = await createUser({ email, fullName, role, passwordHash });
      const token = signAccessToken(user);

      logEvent('info', 'register_success', { userId: user.id, role: user.role });

      return res.status(201).json({
        message: 'Registration successful',
        token,
        user: toPublicUser(user),
      });
    } catch (err) {
      return next(err);
    }
  }
);

router.post(
  '/login',
  rejectUnknownFields(['email', 'password']),
  loginValidators,
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await findByEmail(email);

      // Same failure message whether the user is missing or the password is wrong
      // so account enumeration is harder (OWASP, 2025a).
      const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;

      if (!user || !passwordOk) {
        logEvent('info', 'login_failed');
        throw new AppError('Invalid email or password', 401);
      }

      const token = signAccessToken(user);
      logEvent('info', 'login_success', { userId: user.id, role: user.role });

      return res.status(200).json({
        message: 'Login successful',
        token,
        user: toPublicUser(user),
      });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
