/**
 * Protected sample route.
 *
 * JWT middleware must run on every request beyond login/register so that
 * subsequent API calls can identify the authenticated user
 * (Sheffer, Hardt and Jones, 2020).
 */

const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { getUser } = require('../controllers/userController');

const router = express.Router();

router.get('/', authenticate, getUser);

module.exports = router;
