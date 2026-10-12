/**
 * CSV escaping + formula-injection guards used by report export.
 */
const assert = require('assert');

function escapeCsvCell(value) {
  const s = String(value ?? '');
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

assert.strictEqual(escapeCsvCell('Fuel'), 'Fuel');
assert.strictEqual(escapeCsvCell('=1+1'), "'=1+1");
assert.strictEqual(escapeCsvCell('+cmd'), "'+cmd");
assert.strictEqual(escapeCsvCell('-2'), "'-2");
assert.strictEqual(escapeCsvCell('@sum'), "'@sum");
assert.strictEqual(escapeCsvCell('say "hi"'), '"say ""hi"""');
assert.strictEqual(escapeCsvCell('a,b'), '"a,b"');
assert.strictEqual(escapeCsvCell('line\nbreak'), '"line\nbreak"');

const header = ['Date', 'Kind', 'Category', 'Note', 'Amount'].map(escapeCsvCell).join(',');
const row = ['2026-10-03', 'expense', 'Fuel', '=HYPERLINK("x")', '1800.00']
  .map(escapeCsvCell)
  .join(',');
assert.ok(row.includes("'=HYPERLINK"));
assert.ok(header.startsWith('Date,'));

console.log('checkReportCsv: PASS');
console.log(header);
console.log(row);
