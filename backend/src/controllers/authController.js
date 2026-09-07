const { hashPassword, verifyPassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');
const { findByEmail, createUser } = require('../models/userStore');
const { AppError } = require('../utils/appError');
const { logEvent } = require('../utils/logger');

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

async function register(req, res, next) {
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

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await findByEmail(email);

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

module.exports = {
  register,
  login,
};