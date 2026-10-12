const Bill = require('../models/Bill');
const Transaction = require('../models/Transaction');
const { createCrudController } = require('./crudFactory');
const { asyncHandler, AppError } = require('../utils/errors');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

const base = createCrudController(Bill);
exports.list = base.list;
exports.get = base.get;
exports.create = base.create;
exports.update = base.update;
exports.remove = base.remove;

exports.pay = asyncHandler(async (req, res) => {
  const bill = await Bill.findOne({
    ownerId: req.user._id,
    deletedAt: null,
    $or: [{ _id: req.params.id }, { clientId: req.params.id }],
  });
  if (!bill) throw new AppError('Bill not found', 404, 'NOT_FOUND');

  const paymentKey = req.body.idempotencyKey || req.header('Idempotency-Key');
  if (paymentKey && bill.paymentIdempotencyKey === paymentKey && bill.status === 'paid') {
    return res.json({ ok: true, data: bill, idempotentReplay: true });
  }

  let expense = null;
  if (req.body.createExpense !== false) {
    const expenseClientId = req.body.expenseClientId || uuidv4();
    expense = await Transaction.findOneAndUpdate(
      {
        ownerId: req.user._id,
        $or: [{ clientId: expenseClientId }, { idempotencyKey: paymentKey }],
      },
      {
        $setOnInsert: {
          ownerId: req.user._id,
          clientId: expenseClientId,
          type: 'expense',
          amountCents: bill.amountCents,
          currency: bill.currency,
          occurredAt: new Date(),
          categoryClientId: bill.categoryClientId,
          categoryName: bill.categoryName || 'Bills',
          note: `Bill payment: ${bill.title}`,
          billClientId: bill.clientId,
          idempotencyKey: paymentKey || undefined,
        },
      },
      { upsert: true, new: true }
    );
    bill.linkedExpenseClientId = expense.clientId;
  }

  bill.status = 'paid';
  bill.paidAt = new Date();
  if (paymentKey) bill.paymentIdempotencyKey = paymentKey;
  bill.serverRevision += 1;
  await bill.save();
  res.json({ ok: true, data: { bill, expense } });
});
