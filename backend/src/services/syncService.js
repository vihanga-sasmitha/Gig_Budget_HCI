const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Platform = require('../models/Platform');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingsGoal');
const Bill = require('../models/Bill');
const Notification = require('../models/Notification');
const SyncCursor = require('../models/SyncCursor');
const { AppError } = require('../utils/errors');

const COLLECTIONS = {
  transactions: Transaction,
  categories: Category,
  platforms: Platform,
  budgets: Budget,
  savingsGoals: SavingsGoal,
  bills: Bill,
  notifications: Notification,
};

async function upsertOwned(Model, ownerId, item) {
  if (!item.clientId) throw new AppError('clientId required', 400, 'VALIDATION');
  const existing = await Model.findOne({ ownerId, clientId: item.clientId });
  if (!existing) {
    return Model.create({ ...item, ownerId, serverRevision: 1 });
  }

  const clientRev = item.serverRevision || 0;
  if (clientRev < existing.serverRevision && !item.force) {
    return {
      conflict: true,
      clientId: item.clientId,
      server: existing,
      client: item,
    };
  }

  Object.assign(existing, item, {
    ownerId,
    serverRevision: existing.serverRevision + 1,
  });
  await existing.save();
  return existing;
}

async function push(ownerId, payload = {}) {
  const acks = [];
  const conflicts = [];

  for (const [key, Model] of Object.entries(COLLECTIONS)) {
    const items = payload[key] || [];
    for (const item of items) {
      if (item.idempotencyKey) {
        const prior = await Model.findOne({ ownerId, idempotencyKey: item.idempotencyKey });
        if (prior) {
          acks.push({ collection: key, clientId: prior.clientId, serverRevision: prior.serverRevision });
          continue;
        }
      }
      const result = await upsertOwned(Model, ownerId, item);
      if (result.conflict) conflicts.push({ collection: key, ...result });
      else acks.push({ collection: key, clientId: result.clientId, serverRevision: result.serverRevision });
    }
  }

  await SyncCursor.findOneAndUpdate(
    { ownerId },
    { lastPushAt: new Date(), $inc: { changeSeq: 1 } },
    { upsert: true }
  );

  return { acks, conflicts };
}

async function pull(ownerId, { since } = {}) {
  const filter = { ownerId };
  if (since) filter.updatedAt = { $gt: new Date(since) };

  const data = {};
  for (const [key, Model] of Object.entries(COLLECTIONS)) {
    data[key] = await Model.find(filter).lean();
  }

  await SyncCursor.findOneAndUpdate(
    { ownerId },
    { lastPullAt: new Date() },
    { upsert: true }
  );

  return { pulledAt: new Date().toISOString(), since: since || null, data };
}

module.exports = { push, pull };
