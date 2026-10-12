const mongoose = require('mongoose');

const syncCursorSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    lastPullAt: { type: Date },
    lastPushAt: { type: Date },
    changeSeq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SyncCursor', syncCursorSchema);
