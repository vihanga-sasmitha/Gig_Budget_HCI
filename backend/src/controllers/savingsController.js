const SavingsGoal = require('../models/SavingsGoal');
const { asyncHandler, AppError } = require('../utils/errors');
const { createCrudController } = require('./crudFactory');

const base = createCrudController(SavingsGoal);

function recomputeBalance(goal) {
  let balance = 0;
  for (const entry of goal.entries.filter((e) => !e.deletedAt)) {
    balance += entry.type === 'contribution' ? entry.amountCents : -entry.amountCents;
  }
  if (balance < 0) throw new AppError('Savings balance cannot be negative', 400, 'INSUFFICIENT_SAVINGS');
  goal.balanceCents = balance;
  if (balance >= goal.targetAmountCents && !goal.completedAt) {
    goal.completedAt = new Date();
  }
  if (balance < goal.targetAmountCents) goal.completedAt = null;
}

exports.list = base.list;
exports.get = base.get;
exports.create = base.create;
exports.update = base.update;
exports.remove = base.remove;

exports.addEntry = asyncHandler(async (req, res) => {
  const goal = await SavingsGoal.findOne({
    ownerId: req.user._id,
    deletedAt: null,
    $or: [{ _id: req.params.id }, { clientId: req.params.id }],
  });
  if (!goal) throw new AppError('Goal not found', 404, 'NOT_FOUND');

  const { clientId, type, amountCents, occurredAt, note, idempotencyKey } = req.body;
  if (idempotencyKey) {
    const existing = goal.entries.find((e) => e.idempotencyKey === idempotencyKey && !e.deletedAt);
    if (existing) return res.json({ ok: true, data: goal, idempotentReplay: true });
  }
  if (!['contribution', 'withdrawal'].includes(type)) {
    throw new AppError('Invalid entry type', 400, 'VALIDATION');
  }
  if (!Number.isInteger(amountCents) || amountCents < 1) {
    throw new AppError('amountCents must be a positive integer', 400, 'VALIDATION');
  }

  goal.entries.push({
    clientId,
    type,
    amountCents,
    occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    note,
    idempotencyKey,
  });
  recomputeBalance(goal);
  goal.serverRevision += 1;
  await goal.save();
  res.status(201).json({ ok: true, data: goal });
});

exports.updateEntry = asyncHandler(async (req, res) => {
  const goal = await SavingsGoal.findOne({
    ownerId: req.user._id,
    deletedAt: null,
    $or: [{ _id: req.params.id }, { clientId: req.params.id }],
  });
  if (!goal) throw new AppError('Goal not found', 404, 'NOT_FOUND');
  const entry = goal.entries.id(req.params.entryId) || goal.entries.find((e) => e.clientId === req.params.entryId);
  if (!entry || entry.deletedAt) throw new AppError('Entry not found', 404, 'NOT_FOUND');
  if (req.body.amountCents !== undefined) entry.amountCents = req.body.amountCents;
  if (req.body.note !== undefined) entry.note = req.body.note;
  if (req.body.occurredAt !== undefined) entry.occurredAt = new Date(req.body.occurredAt);
  if (req.body.type !== undefined) entry.type = req.body.type;
  entry.serverRevision = (entry.serverRevision || 1) + 1;
  recomputeBalance(goal);
  goal.serverRevision += 1;
  await goal.save();
  res.json({ ok: true, data: goal });
});

exports.deleteEntry = asyncHandler(async (req, res) => {
  const goal = await SavingsGoal.findOne({
    ownerId: req.user._id,
    deletedAt: null,
    $or: [{ _id: req.params.id }, { clientId: req.params.id }],
  });
  if (!goal) throw new AppError('Goal not found', 404, 'NOT_FOUND');
  const entry = goal.entries.id(req.params.entryId) || goal.entries.find((e) => e.clientId === req.params.entryId);
  if (!entry || entry.deletedAt) throw new AppError('Entry not found', 404, 'NOT_FOUND');
  entry.deletedAt = new Date();
  recomputeBalance(goal);
  goal.serverRevision += 1;
  await goal.save();
  res.json({ ok: true, data: goal });
});
