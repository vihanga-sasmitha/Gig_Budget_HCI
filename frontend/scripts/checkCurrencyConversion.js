/**
 * Unit checks for display-currency conversion (does not mutate ledger cents).
 * Fixed fixture rates only — not live market data.
 */
const assert = require('assert');

// Pure reimplementation for Node without RN AsyncStorage deps
const FIXTURE = {
  base: 'LKR',
  asOf: '2026-10-01T00:00:00.000Z',
  source: 'test-fixture',
  rates: {
    LKR: 1,
    USD: 0.00333,
    EUR: 0.00305,
    GBP: 0.0026,
    INR: 0.278,
    AUD: 0.00505,
  },
};

function convertCents(ledgerCents, { from = 'LKR', to, snapshot = FIXTURE }) {
  if (!to || to === from) return { cents: Math.round(ledgerCents), rate: 1, ok: true };
  if (snapshot.base !== from) {
    return { cents: Math.round(ledgerCents), rate: null, ok: false, reason: 'base_mismatch' };
  }
  const rate = snapshot.rates?.[to];
  if (typeof rate !== 'number' || !(rate > 0)) {
    return { cents: Math.round(ledgerCents), rate: null, ok: false, reason: 'missing_rate' };
  }
  const raw = ledgerCents * rate;
  const cents = raw >= 0 ? Math.round(raw) : -Math.round(-raw);
  return { cents, rate, ok: true };
}

function formatParts(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents) || 0);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${frac}`;
}

// Identity
assert.strictEqual(convertCents(100000, { to: 'LKR' }).cents, 100000);

// LKR 1000.00 → USD at 0.00333 = 3.33 USD = 333 cents
{
  const r = convertCents(100000, { to: 'USD' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.cents, 333);
}

// Switching display repeatedly must not change ledger input
{
  const ledger = 550000; // LKR 5500.00
  const a = convertCents(ledger, { to: 'USD' }).cents;
  const b = convertCents(ledger, { to: 'EUR' }).cents;
  const c = convertCents(ledger, { to: 'USD' }).cents;
  assert.strictEqual(a, c);
  assert.notStrictEqual(a, b);
  assert.strictEqual(ledger, 550000);
}

// Profit = income - expense under same conversion
{
  const income = 550000;
  const expense = 180000;
  const profitLedger = income - expense;
  const i = convertCents(income, { to: 'USD' }).cents;
  const e = convertCents(expense, { to: 'USD' }).cents;
  const p = convertCents(profitLedger, { to: 'USD' }).cents;
  // Convert then subtract may differ by 1 cent from subtract then convert due to rounding;
  // policy: convert totals from ledger net for report profit.
  assert.strictEqual(p, convertCents(370000, { to: 'USD' }).cents);
  assert.ok(Math.abs(i - e - p) <= 1);
}

// Missing rate → ok false, original cents retained
{
  const r = convertCents(10000, { to: 'JPY', snapshot: FIXTURE });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.cents, 10000);
}

// Negative amounts
{
  const r = convertCents(-100000, { to: 'USD' });
  assert.strictEqual(r.cents, -333);
}

// Budget remaining percent uses ledger cents (not display)
{
  const limit = 1000000;
  const spent = 250000;
  const pct = Number(((spent / limit) * 100).toFixed(1));
  assert.strictEqual(pct, 25);
  // Display conversion of both sides preserves ratio when same rate applied
  const limD = convertCents(limit, { to: 'USD' }).cents;
  const spD = convertCents(spent, { to: 'USD' }).cents;
  const pctD = Number(((spD / limD) * 100).toFixed(1));
  assert.ok(Math.abs(pctD - 25) < 0.2);
}

console.log('checkCurrencyConversion: PASS');
console.log('  sample LKR 1000.00 → USD', formatParts(convertCents(100000, { to: 'USD' }).cents));
