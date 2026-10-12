import { getCurrencyMeta, DEFAULT_LEDGER_CURRENCY } from './currencies';
import { convertCents, BUNDLED_RATE_SNAPSHOT } from './rates';

export function centsToParts(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents) || 0);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return { sign, whole, frac: String(frac).padStart(2, '0') };
}

/**
 * Format money for UI.
 * @param {number} ledgerCents - stored integer cents in ledger currency
 * @param {object} opts
 */
export function formatMoney(
  ledgerCents,
  {
    ledgerCurrency = DEFAULT_LEDGER_CURRENCY,
    displayCurrency = ledgerCurrency,
    snapshot = BUNDLED_RATE_SNAPSHOT,
    showSymbol = true,
    compact = false,
  } = {}
) {
  const meta = getCurrencyMeta(displayCurrency);
  const { cents, ok } = convertCents(ledgerCents, {
    from: ledgerCurrency,
    to: displayCurrency,
    snapshot,
  });
  const { sign, whole, frac } = centsToParts(ok ? cents : ledgerCents);
  const code = ok ? displayCurrency : ledgerCurrency;
  const formatted = whole.toLocaleString(meta.locale || 'en-LK');
  if (compact && whole >= 100000) {
    const prefix = showSymbol ? `${code} ` : '';
    return `${sign}${prefix}${(whole / 1000).toFixed(1)}k`;
  }
  const prefix = showSymbol ? `${code} ` : '';
  return `${sign}${prefix}${formatted}.${frac}`;
}

/** @deprecated use formatMoney — kept for gradual migration */
export function formatLKR(cents, opts = {}) {
  return formatMoney(cents, { ledgerCurrency: 'LKR', displayCurrency: 'LKR', ...opts });
}

export function formatCompactLKR(cents) {
  return formatMoney(cents, { ledgerCurrency: 'LKR', displayCurrency: 'LKR', compact: true });
}
