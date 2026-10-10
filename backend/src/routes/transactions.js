/**
 * Transaction routes. All require a valid JWT. Users see only their own
 * transactions; the income summary is restricted to freelancers.
 */

const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');
const transactionController = require('../controllers/transactionController');

const router = express.Router();

router.use(authenticate);

router.get('/mine', requireRole('client', 'freelancer'), transactionController.listMyTransactions);
router.get('/income', requireRole('freelancer'), transactionController.getIncomeSummary);

module.exports = router;
