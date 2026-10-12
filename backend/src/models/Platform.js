const mongoose = require('mongoose');

const platformSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    isSystem: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    serverRevision: { type: Number, default: 1 },
    deletedAt: { type: Date },
    idempotencyKey: { type: String },
  },
  { timestamps: true }
);

platformSchema.index({ ownerId: 1, clientId: 1 }, { unique: true });

module.exports = mongoose.model('Platform', platformSchema);
