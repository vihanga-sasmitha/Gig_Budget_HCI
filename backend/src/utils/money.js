/** Money stored as integer minor units (cents/paisa). Never use float arithmetic. */

function parseMoneyInput(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.round(value * 100);
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ''] = trimmed.split('.');
  const cents = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents < 0) return null;
  return cents;
}

function formatMoney(cents, currency = 'LKR') {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${currency} ${sign}${whole.toLocaleString('en-LK')}.${frac}`;
}

function assertNonNegativeCents(cents) {
  if (!Number.isInteger(cents) || cents < 0) {
    const err = new Error('Amount must be a non-negative integer in minor units');
    err.status = 400;
    throw err;
  }
}

module.exports = { parseMoneyInput, formatMoney, assertNonNegativeCents };
