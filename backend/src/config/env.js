require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '0.0.0.0',
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/gigbudget'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-change-me-32chars!!'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me-32chars!'),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  emailDeliveryMode: process.env.EMAIL_DELIVERY_MODE || 'dev_log',
  appPublicName: process.env.APP_PUBLIC_NAME || 'GigBudget',
};

module.exports = { env };
