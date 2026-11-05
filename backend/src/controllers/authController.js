/**
 * Registration, login, lockout and logout.
 *
 * Failed passwords on a real account are counted and the account is locked
 * after five failures. Logout moves the token version forward so the presented
 * access token stops working (OWASP, 2025a; OWASP, 2025i).
 */

const { hashPassword, verifyPassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');
const {
  findByEmail,
  createUser,
  clearLoginFailures,
  recordFailedLogin,
  incrementTokenVersion,
} = require('../models/userStore');
const { AppError } = require('../utils/appError');
const { logEvent } = require('../utils/logger');
const bcrypt = require('bcryptjs');

// Compared when the email is unknown so the response time stays close to a real
// check and does not reveal whether the account exists (OWASP, 2025a).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('unknown-account', 12);
const LOCKED_MESSAGE = 'This account is temporarily locked. Try again later.';

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function isLocked(user) {
  return Boolean(user.lockUntil) && new Date(user.lockUntil).getTime() > Date.now();
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

    if (!user) {
      await verifyPassword(password, DUMMY_PASSWORD_HASH);
      logEvent('info', 'login_failed');
      throw new AppError('Invalid email or password', 401);
    }

    // An expired lock starts a fresh count so one later mistake does not
    // lock the account again immediately.
    if (user.lockUntil && !isLocked(user)) {
      await clearLoginFailures(user.id);
      user.lockUntil = null;
      user.failedLoginAttempts = 0;
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);

    if (isLocked(user)) {
      logEvent('info', 'login_blocked_locked', { userId: user.id });
      throw new AppError(LOCKED_MESSAGE, 423);
    }

    if (!passwordOk) {
      const failure = await recordFailedLogin(user.id);
      if (failure && failure.locked) {
        logEvent('info', 'account_locked', { userId: user.id });
        throw new AppError(LOCKED_MESSAGE, 423);
      }

      logEvent('info', 'login_failed', { userId: user.id });
      throw new AppError('Invalid email or password', 401);
    }

    await clearLoginFailures(user.id);
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

/**
 * Ends the session by moving the user's token version forward.
 * Tokens issued before this call no longer pass authentication (OWASP, 2025i).
 */
async function logout(req, res, next) {
  try {
    await incrementTokenVersion(req.user.id);
    logEvent('info', 'logout', { userId: req.user.id });
    return res.status(200).json({ message: 'Logged out' });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
};