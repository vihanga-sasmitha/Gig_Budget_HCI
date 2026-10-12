const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: ['expense', 'income', 'both'], default: 'expense' },
    icon: { type: String },
    color: { type: String },
    isSystem: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    serverRevision: { type: Number, default: 1 },
    deletedAt: { type: Date },
    idempotencyKey: { type: String },
  },
  { timestamps: true }
);

categorySchema.index({ ownerId: 1, clientId: 1 }, { unique: true });
categorySchema.index(
  { ownerId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

module.exports = mongoose.model('Category', categorySchema);
