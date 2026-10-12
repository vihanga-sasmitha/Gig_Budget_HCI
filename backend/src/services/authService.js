const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { env } = require('../config/env');
const { AppError } = require('../utils/errors');
const { sendEmail } = require('../utils/email');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessTtl,
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString(), typ: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshTtl,
  });
}

async function register({ email, password, name, occupation }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
  if (!password || password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    name,
    occupation: occupation || 'other',
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokens.push({
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  await user.save();

  return { user: user.toSafeJSON(), accessToken, refreshToken };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokens.push({
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  await user.save();
  return { user: user.toSafeJSON(), accessToken, refreshToken };
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch {
    throw new AppError('Invalid refresh token', 401, 'TOKEN_EXPIRED');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw new AppError('Invalid refresh token', 401, 'TOKEN_EXPIRED');

  const hashed = hashToken(refreshToken);
  const stored = user.refreshTokens.find((t) => t.tokenHash === hashed && !t.revokedAt);
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Invalid refresh token', 401, 'TOKEN_EXPIRED');
  }

  const accessToken = signAccessToken(user);
  return { user: user.toSafeJSON(), accessToken };
}

async function logout(user, refreshToken) {
  if (!refreshToken) return;
  const hashed = hashToken(refreshToken);
  const stored = user.refreshTokens.find((t) => t.tokenHash === hashed);
  if (stored) {
    stored.revokedAt = new Date();
    await user.save();
  }
}

async function forgotPassword(email) {
  // Always return the same message to avoid account enumeration.
  const generic = {
    message: 'If an account exists for that email, a reset link has been sent.',
  };
  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (!user) return generic;

  const raw = crypto.randomBytes(32).toString('hex');
  user.recoveryTokens.push({
    tokenHash: hashToken(raw),
    purpose: 'password_reset',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  await user.save();

  await sendEmail({
    to: user.email,
    subject: `${env.appPublicName} password reset`,
    text: `Use this single-use token within 1 hour to reset your password: ${raw}`,
  });

  return generic;
}

async function resetPassword({ token, newPassword }) {
  if (!newPassword || newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
  }
  const hashed = hashToken(token);
  const user = await User.findOne({
    'recoveryTokens.tokenHash': hashed,
    'recoveryTokens.purpose': 'password_reset',
  });
  if (!user) throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');

  const entry = user.recoveryTokens.find(
    (t) => t.tokenHash === hashed && t.purpose === 'password_reset' && !t.usedAt
  );
  if (!entry || entry.expiresAt < new Date()) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
  }

  entry.usedAt = new Date();
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.refreshTokens.forEach((t) => {
    t.revokedAt = t.revokedAt || new Date();
  });
  await user.save();
  return { message: 'Password updated' };
}

async function changePassword(user, { currentPassword, newPassword }) {
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new AppError('Current password is incorrect', 400, 'INVALID_CREDENTIALS');
  if (!newPassword || newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
  }
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  return { message: 'Password changed' };
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
};
