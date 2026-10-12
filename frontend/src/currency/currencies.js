/** Supported display/ledger currencies for GigBudget. */
export const SUPPORTED_CURRENCIES = [
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', locale: 'en-LK' },
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'en-IE' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
];

export const DEFAULT_LEDGER_CURRENCY = 'LKR';

export function getCurrencyMeta(code) {
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === code) ||
    SUPPORTED_CURRENCIES.find((c) => c.code === DEFAULT_LEDGER_CURRENCY)
  );
}

export function isSupportedCurrency(code) {
  return SUPPORTED_CURRENCIES.some((c) => c.code === code);
}
