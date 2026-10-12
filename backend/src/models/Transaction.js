const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    amountCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'LKR' },
    occurredAt: { type: Date, required: true, index: true },
    categoryClientId: { type: String },
    categoryName: { type: String },
    platformClientId: { type: String },
    platformName: { type: String },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank', 'card', 'mobile_wallet', 'other'],
      default: 'cash',
    },
    note: { type: String, maxlength: 500 },
    billClientId: { type: String },
    syncStatus: { type: String, enum: ['synced', 'pending', 'failed', 'conflict'], default: 'synced' },
    serverRevision: { type: Number, default: 1 },
    deletedAt: { type: Date },
    idempotencyKey: { type: String },
  },
  { timestamps: true }
);

transactionSchema.index({ ownerId: 1, clientId: 1 }, { unique: true });
transactionSchema.index(
  { ownerId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);
transactionSchema.index({ ownerId: 1, updatedAt: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
