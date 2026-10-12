const { parseMoneyInputToCents, formatLKR } = require('./money');

describe('frontend money utils', () => {
  test('5500 LKR to cents', () => {
    expect(parseMoneyInputToCents('5500')).toBe(550000);
  });

  test('rejects more than 2 decimals by truncation at parse of well-formed input', () => {
    expect(parseMoneyInputToCents('18.50')).toBe(1850);
  });

  test('formats LKR', () => {
    expect(formatLKR(370000)).toContain('3,700');
  });
});
