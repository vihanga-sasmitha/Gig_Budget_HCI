const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: String, required: true },
    type: {
      type: String,
      enum: ['bill_due', 'bill_overdue', 'budget_threshold', 'savings_reminder', 'missed_logging', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    relatedClientId: { type: String },
    readAt: { type: Date },
    scheduledFor: { type: Date },
    dedupeKey: { type: String },
    serverRevision: { type: Number, default: 1 },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ ownerId: 1, clientId: 1 }, { unique: true });
notificationSchema.index(
  { ownerId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
);

module.exports = mongoose.model('Notification', notificationSchema);
