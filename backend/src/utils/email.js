const { env } = require('../config/env');

/**
 * Configurable email delivery.
 * EMAIL_DELIVERY_MODE=dev_log writes tokens to console for local testing.
 * Never embeds a fixed production OTP.
 */
async function sendEmail({ to, subject, text, html }) {
  if (env.emailDeliveryMode === 'dev_log') {
    // eslint-disable-next-line no-console
    console.log('[email:dev_log]', { to, subject, text, html });
    return { delivered: true, mode: 'dev_log' };
  }
  throw new Error(`Unsupported EMAIL_DELIVERY_MODE: ${env.emailDeliveryMode}`);
}

module.exports = { sendEmail };
