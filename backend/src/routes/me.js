/**
 * Protected sample route.
 *
 * JWT middleware must run on every request beyond login/register so that
 * subsequent API calls can identify the authenticated user
 * (Sheffer, Hardt and Jones, 2020).
 */

const express = require('express');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  res.status(200).json({
    user: {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role,
    },
  });
});

module.exports = router;
