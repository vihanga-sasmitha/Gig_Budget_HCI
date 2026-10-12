const { asyncHandler, AppError } = require('../utils/errors');

exports.me = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: req.user.toSafeJSON() });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'occupation', 'gigType', 'imageUrl', 'currency', 'language'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) req.user[key] = req.body[key];
  }
  if (req.body.currency && req.body.currency !== 'LKR') {
    // Currency switch policy: allow preference change but do not convert historical amounts.
    req.user.currency = req.body.currency;
  }
  await req.user.save();
  res.json({ ok: true, data: req.user.toSafeJSON() });
});

exports.updatePreferences = asyncHandler(async (req, res) => {
  req.user.preferences = { ...req.user.preferences.toObject?.() || req.user.preferences, ...req.body };
  await req.user.save();
  res.json({ ok: true, data: req.user.preferences });
});

exports.deleteMe = asyncHandler(async (req, res) => {
  if (req.body.confirm !== 'DELETE') {
    throw new AppError('Send confirm: \"DELETE\" to permanently mark account deleted', 400, 'CONFIRM_REQUIRED');
  }
  req.user.deletedAt = new Date();
  await req.user.save();
  res.json({ ok: true, data: { deleted: true } });
});
