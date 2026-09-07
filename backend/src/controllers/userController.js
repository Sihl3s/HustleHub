const { AppError } = require('../utils/appError');
const { findByEmail } = require('../models/userStore');

async function getUser(req, res, next) {
  try {
    const user = await findByEmail(req.user.email);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getUser,
};