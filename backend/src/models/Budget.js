const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    scope: { type: String, enum: ['overall', 'category'], default: 'overall' },
    categoryClientId: { type: String },
    amountCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'LKR' },
    period: { type: String, enum: ['week', 'month', 'year', 'custom'], default: 'month' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    alertThresholdPercent: { type: Number, default: 80 },
    serverRevision: { type: Number, default: 1 },
    deletedAt: { type: Date },
    idempotencyKey: { type: String },
  },
  { timestamps: true }
);

budgetSchema.index({ ownerId: 1, clientId: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
