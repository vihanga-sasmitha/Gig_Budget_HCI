const { parseMoneyInput, formatMoney } = require('../src/utils/money');

describe('money helpers', () => {
  test('parses valid amounts to cents', () => {
    expect(parseMoneyInput('5500')).toBe(550000);
    expect(parseMoneyInput('18.50')).toBe(1850);
    expect(parseMoneyInput(12.5)).toBe(1250);
  });

  test('rejects malformed amounts', () => {
    expect(parseMoneyInput('-1')).toBeNull();
    expect(parseMoneyInput('12.345')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
    expect(parseMoneyInput('')).toBeNull();
  });

  test('formats LKR', () => {
    expect(formatMoney(370000, 'LKR')).toContain('3,700');
  });
});
