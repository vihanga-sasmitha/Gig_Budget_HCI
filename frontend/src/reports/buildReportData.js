import { listTransactions, listBudgets, listSavingsGoals, budgetSpent, getOutboxCount } from '../db/database';
import { rangeForPeriod, colomboDateKey, formatDisplayDate } from '../utils/dateColombo';
import { formatMoney } from '../currency/formatMoney';
import { describeRateBasis } from '../currency/rates';

function escapeCsvCell(value) {
  const s = String(value ?? '');
  // Prevent spreadsheet formula injection
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

export function resolveReportRange(preset, customStart, customEnd) {
  if (preset === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd, label: `${formatDisplayDate(customStart)} – ${formatDisplayDate(customEnd)}` };
  }
  if (preset === 'day') {
    const d = colomboDateKey();
    return { start: d, end: d, label: formatDisplayDate(d) };
  }
  if (preset === 'week') {
    const { start, end } = rangeForPeriod('week');
    return { start, end, label: `${formatDisplayDate(start)} – ${formatDisplayDate(end)}` };
  }
  const { start, end } = rangeForPeriod('month');
  return { start, end, label: `${formatDisplayDate(start)} – ${formatDisplayDate(end)}` };
}

export async function buildReportData({
  preset = 'month',
  customStart,
  customEnd,
  profileName,
  ledgerCurrency,
  displayCurrency,
  fxSnapshot,
}) {
  const range = resolveReportRange(preset, customStart, customEnd);
  const [txs, budgets, goals, pending] = await Promise.all([
    listTransactions({ start: range.start, end: range.end, limit: 5000 }),
    listBudgets(),
    listSavingsGoals(),
    getOutboxCount().catch(() => 0),
  ]);

  let incomeCents = 0;
  let expenseCents = 0;
  const byCategory = {};
  const details = [];

  for (const tx of txs) {
    if (tx.kind === 'income') incomeCents += tx.amount_cents;
    else if (tx.kind === 'expense') {
      expenseCents += tx.amount_cents;
      const cat = tx.category_name || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + tx.amount_cents;
    }
    details.push(tx);
  }

  const profitCents = incomeCents - expenseCents;
  const categoryRows = Object.entries(byCategory)
    .map(([name, cents]) => ({
      name,
      cents,
      percent: expenseCents === 0 ? 0 : Number(((cents / expenseCents) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.cents - a.cents);

  const budgetRows = await Promise.all(
    budgets.map(async (b) => {
      const spent = await budgetSpent(b.category_id, range.start, range.end);
      return {
        name: b.category_name || b.category_id || 'Budget',
        limitCents: b.amount_cents,
        spentCents: spent,
        remainingCents: Math.max(b.amount_cents - spent, 0),
      };
    })
  );

  const moneyOpts = { ledgerCurrency, displayCurrency, snapshot: fxSnapshot };
  const fmt = (c) => formatMoney(c, moneyOpts);
  const basis = describeRateBasis(fxSnapshot, ledgerCurrency, displayCurrency);

  return {
    title: 'GigBudget Financial Report',
    accountName: profileName || 'Gig Worker',
    timezone: 'Asia/Colombo',
    generatedAt: new Date().toISOString(),
    range,
    pendingSyncCount: pending,
    ledgerCurrency,
    displayCurrency,
    rateBasis: basis,
    totals: {
      incomeCents,
      expenseCents,
      profitCents,
      income: fmt(incomeCents),
      expense: fmt(expenseCents),
      profit: fmt(profitCents),
    },
    categoryRows: categoryRows.map((r) => ({ ...r, amount: fmt(r.cents) })),
    budgetRows: budgetRows.map((r) => ({
      ...r,
      limit: fmt(r.limitCents),
      spent: fmt(r.spentCents),
      remaining: fmt(r.remainingCents),
    })),
    goals: goals.map((g) => ({
      name: g.name,
      current: fmt(g.current_cents),
      target: fmt(g.target_cents),
      deadline: g.deadline_key || null,
    })),
    transactions: details.map((tx) => ({
      date: tx.date_key,
      kind: tx.kind,
      category: tx.category_name || '',
      note: tx.note || '',
      amount: fmt(tx.kind === 'expense' ? -tx.amount_cents : tx.amount_cents),
      amountCents: tx.amount_cents,
    })),
  };
}

export function reportToCsv(report) {
  const lines = [];
  lines.push(['GigBudget Financial Report']);
  lines.push(['Account', report.accountName]);
  lines.push(['Period', report.range.label]);
  lines.push(['Timezone', report.timezone]);
  lines.push(['Generated', report.generatedAt]);
  lines.push(['Display currency', report.displayCurrency]);
  lines.push(['Ledger currency', report.ledgerCurrency]);
  if (report.rateBasis?.converted) {
    lines.push(['FX', report.rateBasis.direction, report.rateBasis.source, report.rateBasis.asOf]);
  }
  lines.push([]);
  lines.push(['Income', report.totals.income]);
  lines.push(['Expenses', report.totals.expense]);
  lines.push(['Net profit', report.totals.profit]);
  lines.push([]);
  lines.push(['Category', 'Amount', '% of expenses']);
  for (const row of report.categoryRows) {
    lines.push([row.name, row.amount, String(row.percent)]);
  }
  lines.push([]);
  lines.push(['Date', 'Type', 'Category', 'Note', 'Amount']);
  for (const tx of report.transactions) {
    lines.push([tx.date, tx.kind, tx.category, tx.note, tx.amount]);
  }
  return lines.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function reportToHtml(report) {
  const cats = report.categoryRows
    .map(
      (r) =>
        `<tr><td>${escHtml(r.name)}</td><td style="text-align:right">${escHtml(r.amount)}</td><td style="text-align:right">${r.percent}%</td></tr>`
    )
    .join('');
  const txs = report.transactions
    .map(
      (t) =>
        `<tr><td>${escHtml(t.date)}</td><td>${escHtml(t.kind)}</td><td>${escHtml(t.category)}</td><td>${escHtml(t.note)}</td><td style="text-align:right">${escHtml(t.amount)}</td></tr>`
    )
    .join('');
  const budgets = report.budgetRows
    .map(
      (b) =>
        `<tr><td>${escHtml(b.name)}</td><td style="text-align:right">${escHtml(b.spent)}</td><td style="text-align:right">${escHtml(b.limit)}</td><td style="text-align:right">${escHtml(b.remaining)}</td></tr>`
    )
    .join('');
  const fx = report.rateBasis?.converted
    ? `<p class="muted">FX: ${escHtml(report.rateBasis.direction)} · ${escHtml(report.rateBasis.source)} · ${escHtml(report.rateBasis.asOf)}${report.rateBasis.stale ? ' (cached)' : ''}</p>`
    : '';
  const pending =
    report.pendingSyncCount > 0
      ? `<p class="warn">Local data includes ${report.pendingSyncCount} pending sync change(s).</p>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #172321; font-size: 12px; }
  h1 { color: #117C78; font-size: 22px; margin-bottom: 4px; }
  h2 { color: #117C78; font-size: 15px; margin-top: 22px; }
  .muted { color: #5F6F6B; }
  .warn { color: #B45309; }
  .card { border: 1px solid #C5DDD9; border-radius: 10px; padding: 12px; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border-bottom: 1px solid #E2EEEC; padding: 6px 4px; text-align: left; }
  th { background: #E6F6F5; color: #117C78; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .totals td { font-weight: 700; font-size: 14px; }
  @page { margin: 18mm 14mm; }
</style>
</head>
<body>
  <h1>${escHtml(report.title)}</h1>
  <p class="muted">${escHtml(report.accountName)} · Period: ${escHtml(report.range.label)} · TZ ${escHtml(report.timezone)}</p>
  <p class="muted">Generated ${escHtml(new Date(report.generatedAt).toLocaleString())} · Display ${escHtml(report.displayCurrency)} (ledger ${escHtml(report.ledgerCurrency)})</p>
  ${fx}${pending}
  <div class="card">
    <table class="totals">
      <tr><td>Income</td><td style="text-align:right">${escHtml(report.totals.income)}</td></tr>
      <tr><td>Expenses</td><td style="text-align:right">${escHtml(report.totals.expense)}</td></tr>
      <tr><td>Net profit</td><td style="text-align:right">${escHtml(report.totals.profit)}</td></tr>
    </table>
  </div>
  <h2>Spending by category</h2>
  <table>
    <thead><tr><th>Category</th><th>Amount</th><th>%</th></tr></thead>
    <tbody>${cats || '<tr><td colspan="3">No expenses in this period</td></tr>'}</tbody>
  </table>
  <h2>Budgets (period spend vs limits)</h2>
  <table>
    <thead><tr><th>Budget</th><th>Spent</th><th>Limit</th><th>Remaining</th></tr></thead>
    <tbody>${budgets || '<tr><td colspan="4">No budgets</td></tr>'}</tbody>
  </table>
  <h2>Savings goals</h2>
  <table>
    <thead><tr><th>Goal</th><th>Current</th><th>Target</th><th>Deadline</th></tr></thead>
    <tbody>${
      report.goals.length
        ? report.goals
            .map(
              (g) =>
                `<tr><td>${escHtml(g.name)}</td><td style="text-align:right">${escHtml(g.current)}</td><td style="text-align:right">${escHtml(g.target)}</td><td>${escHtml(g.deadline || '—')}</td></tr>`
            )
            .join('')
        : '<tr><td colspan="4">No savings goals</td></tr>'
    }</tbody>
  </table>
  <h2>Transactions</h2>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Note</th><th>Amount</th></tr></thead>
    <tbody>${txs || '<tr><td colspan="5">No transactions in this period</td></tr>'}</tbody>
  </table>
</body>
</html>`;
}
