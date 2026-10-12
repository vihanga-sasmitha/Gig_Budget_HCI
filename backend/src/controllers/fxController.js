const { getRates } = require('../services/fxService');

exports.rates = (req, res) => {
  const base = String(req.query.base || 'LKR').toUpperCase();
  const data = getRates(base);
  res.json({ ok: true, data });
};
