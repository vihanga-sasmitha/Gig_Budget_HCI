const mongoose = require('mongoose');

const savingsEntrySchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true },
    type: { type: String, enum: ['contribution', 'withdrawal'], required: true },
    amountCents: { type: Number, required: true, min: 1 },
    occurredAt: { type: Date, required: true },
    note: { type: String, maxlength: 500 },
    serverRevision: { type: Number, default: 1 },
    deletedAt: { type: Date },
    idempotencyKey: { type: String },
  },
  { timestamps: true }
);

const savingsGoalSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    targetAmountCents: { type: Number, required: true, min: 1 },
    targetDate: { type: Date },
    icon: { type: String },
    currency: { type: String, default: 'LKR' },
    balanceCents: { type: Number, default: 0, min: 0 },
    completedAt: { type: Date },
    entries: [savingsEntrySchema],
    serverRevision: { type: Number, default: 1 },
    deletedAt: { type: Date },
    idempotencyKey: { type: String },
  },
  { timestamps: true }
);

savingsGoalSchema.index({ ownerId: 1, clientId: 1 }, { unique: true });

module.exports = mongoose.model('SavingsGoal', savingsGoalSchema);
