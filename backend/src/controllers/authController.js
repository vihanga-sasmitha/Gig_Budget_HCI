const authService = require('../services/authService');
const { asyncHandler } = require('../utils/errors');

exports.register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ ok: true, data: result });
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json({ ok: true, data: result });
});

exports.refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  res.json({ ok: true, data: result });
});

exports.logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user, req.body.refreshToken);
  res.json({ ok: true, data: { message: 'Logged out' } });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  res.json({ ok: true, data: result });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json({ ok: true, data: result });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user, req.body);
  res.json({ ok: true, data: result });
});
