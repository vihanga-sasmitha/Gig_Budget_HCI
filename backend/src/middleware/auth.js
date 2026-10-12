const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/User');
const { AppError } = require('../utils/errors');

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');

    let payload;
    try {
      payload = jwt.verify(token, env.jwtAccessSecret);
    } catch {
      throw new AppError('Invalid or expired access token', 401, 'TOKEN_EXPIRED');
    }

    const user = await User.findById(payload.sub);
    if (!user || user.deletedAt) throw new AppError('User not found', 401, 'UNAUTHORIZED');

    req.user = user;
    req.auth = payload;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
