const reportService = require('../services/reportService');
const { asyncHandler } = require('../utils/errors');

exports.dashboard = asyncHandler(async (req, res) => {
  const tz = req.user.preferences?.timezone || 'Asia/Colombo';
  const data = await reportService.dashboard(req.user._id, tz);
  res.json({ ok: true, data });
});

exports.reports = asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : reportService.startOfDay(new Date());
  const to = req.query.to ? new Date(req.query.to) : reportService.addDays(from, 7);
  const data = await reportService.summarize(req.user._id, { from, to });
  res.json({ ok: true, data });
});
