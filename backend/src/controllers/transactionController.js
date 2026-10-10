/**
 * Transaction history and freelancer income.
 *
 * Every query is scoped to the caller's id from the JWT, so users only ever
 * see transactions they are a party to, and income is attributed to the
 * freelancer recorded on each transaction (OWASP, 2025a).
 */

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

function toPublicTransaction(transaction) {
  const party = (value) => (value && value._id
    ? { id: value._id.toString(), fullName: value.fullName }
    : { id: value.toString() });

  return {
    id: transaction._id.toString(),
    booking: transaction.booking.toString(),
    gig: transaction.gig && transaction.gig._id
      ? { id: transaction.gig._id.toString(), title: transaction.gig.title }
      : { id: transaction.gig.toString() },
    client: party(transaction.client),
    freelancer: party(transaction.freelancer),
    amount: transaction.amount,
    status: transaction.status,
    createdAt: transaction.createdAt,
  };
}

async function listMyTransactions(req, res, next) {
  try {
    const filter = req.user.role === 'freelancer'
      ? { freelancer: req.user.id }
      : { client: req.user.id };

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .populate('gig', 'title')
      .populate('client', 'fullName')
      .populate('freelancer', 'fullName');

    return res.status(200).json({ transactions: transactions.map(toPublicTransaction) });
  } catch (err) {
    return next(err);
  }
}

/** Income earned by the calling freelancer, in total and per month. */
async function getIncomeSummary(req, res, next) {
  try {
    const match = {
      freelancer: new mongoose.Types.ObjectId(req.user.id),
      status: 'completed',
    };

    const [totals] = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: null, totalIncome: { $sum: '$amount' }, transactionCount: { $sum: 1 } } },
    ]);

    const monthly = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          income: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      income: {
        currency: 'ZAR',
        totalIncome: totals ? totals.totalIncome : 0,
        transactionCount: totals ? totals.transactionCount : 0,
        monthly: monthly.map((m) => ({
          month: m._id,
          income: m.income,
          transactionCount: m.transactionCount,
        })),
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listMyTransactions, getIncomeSummary };
