/**
 * Backend FX rates — no third-party secrets required.
 * Rates are units of each currency per 1 unit of base (LKR).
 * Operators may override via FX_RATES_JSON env (JSON object).
 */

const DEFAULT_RATES = {
  LKR: 1,
  USD: 0.00333,
  EUR: 0.00305,
  GBP: 0.0026,
  INR: 0.278,
  AUD: 0.00505,
};

function loadConfiguredRates() {
  if (process.env.FX_RATES_JSON) {
    try {
      const parsed = JSON.parse(process.env.FX_RATES_JSON);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_RATES, ...parsed };
      }
    } catch {
      // fall through
    }
  }
  return { ...DEFAULT_RATES };
}

function getRates(base = 'LKR') {
  const rates = loadConfiguredRates();
  if (base !== 'LKR') {
    // Rebase: rate_to = rate_to_LKR_view / rate_base_LKR_view
    const basePerLkr = rates[base];
    if (!basePerLkr) {
      return {
        base: 'LKR',
        rates,
        asOf: process.env.FX_RATES_AS_OF || new Date().toISOString(),
        source: process.env.FX_RATES_SOURCE || 'gigbudget-configured-table',
        note: `Unknown base ${base}; returned LKR table`,
      };
    }
    const rebased = {};
    for (const [code, perLkr] of Object.entries(rates)) {
      rebased[code] = perLkr / basePerLkr;
    }
    return {
      base,
      rates: rebased,
      asOf: process.env.FX_RATES_AS_OF || new Date().toISOString(),
      source: process.env.FX_RATES_SOURCE || 'gigbudget-configured-table',
    };
  }
  return {
    base: 'LKR',
    rates,
    asOf: process.env.FX_RATES_AS_OF || new Date().toISOString(),
    source: process.env.FX_RATES_SOURCE || 'gigbudget-configured-table',
  };
}

module.exports = { getRates, DEFAULT_RATES };
