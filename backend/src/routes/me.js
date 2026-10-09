/**
 * Current-user route. JWT middleware runs first so the caller is identified on
 * every request (Sheffer, Hardt and Jones, 2020). The profile is read from
 * the database via the token's subject id.
 */

const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { getUser } = require('../controllers/userController');

const router = express.Router();

router.get('/', authenticate, getUser);

module.exports = router;
