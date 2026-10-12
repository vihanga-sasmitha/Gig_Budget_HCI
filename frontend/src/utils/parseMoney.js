/** Parse user money input to integer cents (2 decimal places). */
export function parseMoneyInputToCents(input) {
  if (!input || input === '.') return 0;
  const normalized = String(input).replace(/[^0-9.]/g, '');
  const parts = normalized.split('.');
  const whole = parseInt(parts[0] || '0', 10) || 0;
  let frac = (parts[1] || '').slice(0, 2);
  while (frac.length < 2) frac += '0';
  const cents = parseInt(frac || '0', 10) || 0;
  return whole * 100 + cents;
}
