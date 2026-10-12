const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  { _id: true }
);

const recoveryTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    purpose: { type: String, enum: ['password_reset', 'email_verify'], required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    occupation: {
      type: String,
      enum: [
        'delivery_rider',
        'freelancer',
        'online_seller',
        'ride_hailing_driver',
        'student_gig_worker',
        'other',
      ],
      default: 'other',
    },
    gigType: { type: String, trim: true },
    imageUrl: { type: String },
    currency: { type: String, default: 'LKR' },
    language: { type: String, default: 'en' },
    emailVerifiedAt: { type: Date },
    /** Seed-owned demo marker, e.g. gigbudget-demo-v1. Never set by normal registration. */
    demoSeedKey: { type: String, index: true },
    /** Asia/Colombo YYYY-MM-DD anchor used when generating relative demo history */
    demoSeedAnchor: { type: String },
    preferences: {
      notificationsEnabled: { type: Boolean, default: true },
      darkMode: { type: Boolean, default: false },
      lockTimeoutSeconds: { type: Number, default: 60 },
      biometricsEnabled: { type: Boolean, default: false },
      quietHoursStart: { type: String },
      quietHoursEnd: { type: String },
      weekStartsOn: { type: Number, default: 1 },
      timezone: { type: String, default: 'Asia/Colombo' },
      analyticsPeriod: { type: String, default: 'week' },
      analyticsCategories: [{ type: String }],
    },
    refreshTokens: [refreshTokenSchema],
    recoveryTokens: [recoveryTokenSchema],
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name,
    phone: this.phone,
    occupation: this.occupation,
    gigType: this.gigType,
    imageUrl: this.imageUrl,
    currency: this.currency,
    language: this.language,
    emailVerifiedAt: this.emailVerifiedAt,
    preferences: this.preferences,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', userSchema);
