const Transaction = require('../models/Transaction');

function startOfDay(date, timeZone = 'Asia/Colombo') {
  const d = new Date(date);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const day = parts.find((p) => p.type === 'day').value;
  return new Date(`${y}-${m}-${day}T00:00:00+05:30`);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function summarize(ownerId, { from, to }) {
  const docs = await Transaction.find({
    ownerId,
    deletedAt: null,
    occurredAt: { $gte: from, $lt: to },
  }).lean();

  let incomeCents = 0;
  let expenseCents = 0;
  const byCategory = {};

  for (const tx of docs) {
    if (tx.type === 'income') incomeCents += tx.amountCents;
    else {
      expenseCents += tx.amountCents;
      const key = tx.categoryName || 'Other';
      byCategory[key] = (byCategory[key] || 0) + tx.amountCents;
    }
  }

  const profitCents = incomeCents - expenseCents;
  const savingsRate =
    incomeCents === 0 ? null : Number(((profitCents / incomeCents) * 100).toFixed(1));

  return {
    from,
    to,
    incomeCents,
    expenseCents,
    profitCents,
    savingsRate,
    byCategory: Object.entries(byCategory).map(([name, cents]) => ({
      name,
      amountCents: cents,
      percent: expenseCents === 0 ? 0 : Number(((cents / expenseCents) * 100).toFixed(1)),
    })),
  };
}

async function dashboard(ownerId, timezone = 'Asia/Colombo') {
  const todayStart = startOfDay(new Date(), timezone);
  const tomorrow = addDays(todayStart, 1);
  const weekStart = addDays(todayStart, -((todayStart.getDay() + 6) % 7));
  const monthStart = new Date(todayStart);
  monthStart.setDate(1);

  const [today, week, month, recent] = await Promise.all([
    summarize(ownerId, { from: todayStart, to: tomorrow }),
    summarize(ownerId, { from: weekStart, to: tomorrow }),
    summarize(ownerId, {
      from: monthStart,
      to: tomorrow,
    }),
    Transaction.find({ ownerId, deletedAt: null })
      .sort({ occurredAt: -1 })
      .limit(10)
      .lean(),
  ]);

  return { today, week, month, recent };
}

module.exports = { summarize, dashboard, startOfDay, addDays };
