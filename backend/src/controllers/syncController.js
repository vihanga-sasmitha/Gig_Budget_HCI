const syncService = require('../services/syncService');
const { asyncHandler } = require('../utils/errors');

exports.push = asyncHandler(async (req, res) => {
  const data = await syncService.push(req.user._id, req.body);
  res.json({ ok: true, data });
});

exports.pull = asyncHandler(async (req, res) => {
  const data = await syncService.pull(req.user._id, { since: req.query.since });
  res.json({ ok: true, data });
});
