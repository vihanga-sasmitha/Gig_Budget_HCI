/**
 * Read-oriented verification of demo seed against the configured MongoDB + live API.
 * Does not use dropDatabase. Optional tagged cleanup for the single ownership probe write.
 */
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const { connectDb, disconnectDb } = require('../config/db');
const { createApp } = require('../app');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingsGoal');
const Bill = require('../models/Bill');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const User = require('../models/User');

const ACCOUNTS = [
  { email: 'sasmitha@gigbudget.example', password: 'GigBudgetDemo!2026', role: 'main' },
  { email: 'kasun@gigbudget.example', password: 'GigBudgetDemo!2026', role: 'kasun' },
  { email: 'nethmi@gigbudget.example', password: 'GigBudgetDemo!2026', role: 'nethmi' },
];

function colomboDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

async function request(app, method, url, { token, body } = {}) {
  const res = await new Promise((resolve) => {
    const server = app.listen(0, async () => {
      const port = server.address().port;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const r = await fetch(`http://127.0.0.1:${port}${url}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await r.json().catch(() => ({}));
      server.close();
      resolve({ status: r.status, json });
    });
  });
  return res;
}

async function main() {
  await connectDb();
  const app = createApp();
  const results = { checks: [], accounts: {} };
  const tokens = {};

  for (const acc of ACCOUNTS) {
    const login = await request(app, 'POST', '/api/auth/login', {
      body: { email: acc.email, password: acc.password },
    });
    const ok = login.status === 200 && Boolean(login.json?.data?.accessToken);
    results.checks.push({ name: `login:${acc.email}`, ok, status: login.status });
    if (!ok) continue;
    tokens[acc.email] = login.json.data;
    const me = await request(app, 'GET', '/api/users/me', {
      token: login.json.data.accessToken,
    });
    results.checks.push({
      name: `profile:${acc.email}`,
      ok: me.status === 200 && me.json?.data?.email === acc.email,
    });
  }

  const mainToken = tokens['sasmitha@gigbudget.example']?.accessToken;
  const otherToken = tokens['kasun@gigbudget.example']?.accessToken;
  if (mainToken) {
    const dash = await request(app, 'GET', '/api/dashboard', { token: mainToken });
    const today = dash.json?.data?.today || {};
    results.checks.push({
      name: 'main-dashboard-today-seed-totals',
      ok: today.incomeCents === 550000 && today.expenseCents === 180000 && today.profitCents === 370000,
      actual: {
        incomeCents: today.incomeCents,
        expenseCents: today.expenseCents,
        profitCents: today.profitCents,
      },
      expected: { incomeCents: 550000, expenseCents: 180000, profitCents: 370000 },
    });

    const pull = await request(app, 'GET', '/api/sync/pull', { token: mainToken });
    const data = pull.json?.data?.data || {};
    results.checks.push({
      name: 'main-sync-pull',
      ok: pull.status === 200 && (data.transactions || []).length > 100,
      counts: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
      ),
    });

    const mainUser = await User.findOne({ email: 'sasmitha@gigbudget.example' });
    const sample = await Transaction.findOne({
      ownerId: mainUser._id,
      clientId: 'sas-today-inc-1',
    });
    if (sample && otherToken) {
      const steal = await request(app, 'GET', `/api/income/${sample.clientId}`, {
        token: otherToken,
      });
      results.checks.push({
        name: 'ownership-isolation-get',
        ok: steal.status === 404,
        status: steal.status,
      });

      const probeId = `verify-probe-${Date.now()}`;
      const patch = await request(app, 'PATCH', `/api/expenses/${sample.clientId}`, {
        token: otherToken,
        body: { note: probeId },
      });
      results.checks.push({
        name: 'ownership-isolation-patch',
        ok: patch.status === 404,
        status: patch.status,
      });
      // ensure probe note not applied
      const again = await Transaction.findOne({ clientId: 'sas-today-inc-1' });
      results.checks.push({
        name: 'ownership-isolation-no-write',
        ok: !String(again?.note || '').includes('verify-probe'),
      });
    }

    // Savings balance consistency
    const goals = await SavingsGoal.find({ ownerId: mainUser._id, deletedAt: null });
    let savingsOk = true;
    for (const g of goals) {
      let bal = 0;
      for (const e of g.entries.filter((x) => !x.deletedAt)) {
        bal += e.type === 'contribution' ? e.amountCents : -e.amountCents;
      }
      if (bal !== g.balanceCents) savingsOk = false;
    }
    results.checks.push({ name: 'savings-balance-ledger', ok: savingsOk, goals: goals.length });

    const paid = await Bill.find({ ownerId: mainUser._id, status: 'paid', deletedAt: null });
    let paidLinksOk = true;
    for (const b of paid) {
      if (!b.linkedExpenseClientId) {
        paidLinksOk = false;
        continue;
      }
      const expCount = await Transaction.countDocuments({
        ownerId: mainUser._id,
        clientId: b.linkedExpenseClientId,
        deletedAt: null,
      });
      if (expCount !== 1) paidLinksOk = false;
    }
    results.checks.push({ name: 'paid-bills-linked-expenses', ok: paidLinksOk, paid: paid.length });

    const budgets = await Budget.find({ ownerId: mainUser._id, deletedAt: null });
    const anchor = mainUser.demoSeedAnchor || colomboDateKey();
    const monthStart = new Date(`${anchor.slice(0, 7)}-01T00:00:00+05:30`);
    results.checks.push({
      name: 'budgets-present',
      ok: budgets.length >= 4,
      count: budgets.length,
      monthStart: monthStart.toISOString(),
    });

    results.accounts.sasmitha = {
      categories: await Category.countDocuments({ ownerId: mainUser._id, deletedAt: null }),
      transactions: await Transaction.countDocuments({ ownerId: mainUser._id, deletedAt: null }),
      notifications: await Notification.countDocuments({ ownerId: mainUser._id, deletedAt: null }),
      today,
    };
  }

  // Idempotency: count before/after second seed
  const before = await Transaction.countDocuments({
    note: { $regex: /^DEMO/ },
  });
  await new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(__dirname, 'seedDemo.js')], {
      cwd: path.join(__dirname, '../..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let err = '';
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(err || `seed exit ${code}`))));
  });
  const after = await Transaction.countDocuments({
    note: { $regex: /^DEMO/ },
  });
  results.checks.push({
    name: 'repeat-seed-idempotent',
    ok: before === after,
    before,
    after,
  });

  const failed = results.checks.filter((c) => !c.ok);
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: failed.length === 0,
        failed: failed.map((f) => f.name),
        checks: results.checks,
        accounts: results.accounts,
      },
      null,
      2
    )
  );

  await disconnectDb();
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error('VERIFY_FAILED', e.message);
  try {
    await disconnectDb();
  } catch {
    // ignore
  }
  process.exit(1);
});
