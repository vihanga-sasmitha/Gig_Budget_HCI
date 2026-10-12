const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    amountCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'LKR' },
    dueAt: { type: Date, required: true },
    categoryClientId: { type: String },
    categoryName: { type: String },
    recurrence: {
      type: String,
      enum: ['none', 'weekly', 'monthly', 'yearly'],
      default: 'none',
    },
    status: { type: String, enum: ['unpaid', 'paid', 'overdue'], default: 'unpaid' },
    paidAt: { type: Date },
    linkedExpenseClientId: { type: String },
    paymentIdempotencyKey: { type: String },
    reminderEnabled: { type: Boolean, default: true },
    serverRevision: { type: Number, default: 1 },
    deletedAt: { type: Date },
    idempotencyKey: { type: String },
  },
  { timestamps: true }
);

billSchema.index({ ownerId: 1, clientId: 1 }, { unique: true });
billSchema.index(
  { ownerId: 1, paymentIdempotencyKey: 1 },
  { unique: true, partialFilterExpression: { paymentIdempotencyKey: { $type: 'string' } } }
);

module.exports = mongoose.model('Bill', billSchema);
