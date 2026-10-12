/**
 * Repeatable GigBudget demo seed for the configured MONGODB_URI.
 * Upserts by owner + clientId / idempotencyKey. Never dropDatabase.
 *
 * Optional: SEED_RESET_DEMO_PASSWORDS=1 to reset passwords of seed-owned demo users only.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDb, disconnectDb } = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Platform = require('../models/Platform');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingsGoal');
const Bill = require('../models/Bill');
const Notification = require('../models/Notification');
const SyncCursor = require('../models/SyncCursor');

const DEMO_SEED_KEY = 'gigbudget-demo-v1';
const DEMO_PASSWORD = 'GigBudgetDemo!2026';
const RESET_PASSWORDS = process.env.SEED_RESET_DEMO_PASSWORDS === '1';

const EXPENSE_CATS = [
  'Food',
  'Fuel',
  'Internet/Data',
  'Vehicle Maintenance',
  'Rent',
  'Bills',
  'Shopping',
  'Transport',
  'Education',
  'Health',
  'Entertainment',
  'Work Equipment',
  'Other',
];

const INCOME_CATS = [
  'Delivery',
  'Freelancing',
  'Online Sales',
  'Ride',
  'Commission',
  'Bonus',
  'Tips',
  'Other',
];

const PLATFORM_NAMES = ['PickMe', 'Uber', 'Fiverr', 'Upwork', 'Daraz', 'Other'];
const PAYMENT_METHODS = ['cash', 'bank', 'card', 'mobile_wallet'];
const COLORS = ['#169E98', '#E1A32B', '#7B61FF', '#159B75', '#D95360', '#117C78', '#6C4EE3'];

function colomboDateKey(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(date);
}

function colomboDayStart(dateKey) {
  return new Date(`${dateKey}T10:00:00+05:30`);
}

function addDaysKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function monthBounds(anchorKey) {
  const [y, m] = anchorKey.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { start, end };
}

function prevMonthBounds(anchorKey) {
  const [y, m] = anchorKey.split('-').map(Number);
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  const start = `${py}-${String(pm).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(py, pm, 0)).getUTCDate();
  const end = `${py}-${String(pm).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { start, end };
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function lkrToCents(lkr) {
  return Math.round(Number(lkr) * 100);
}

function slug(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function ensureDemoUser(spec, anchor) {
  const email = spec.email.toLowerCase();
  let user = await User.findOne({ email });
  if (user && user.demoSeedKey && user.demoSeedKey !== DEMO_SEED_KEY) {
    throw new Error(`Email ${email} belongs to a different demo seed key; aborting`);
  }
  if (user && !user.demoSeedKey) {
    throw new Error(
      `Collision: ${email} exists without demoSeedKey. Refusing to overwrite. Use another email.`
    );
  }

  let passwordReset = false;
  if (!user) {
    user = await User.create({
      email,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      name: spec.name,
      phone: spec.phone,
      occupation: spec.occupation,
      gigType: spec.gigType,
      currency: 'LKR',
      language: 'en',
      emailVerifiedAt: new Date(),
      demoSeedKey: DEMO_SEED_KEY,
      demoSeedAnchor: anchor,
      preferences: {
        notificationsEnabled: true,
        darkMode: false,
        lockTimeoutSeconds: 60,
        biometricsEnabled: false,
        weekStartsOn: 1,
        timezone: 'Asia/Colombo',
        analyticsPeriod: 'week',
        analyticsCategories: ['Fuel', 'Food', 'Internet/Data'],
      },
    });
  } else {
    user.name = spec.name;
    user.phone = spec.phone;
    user.occupation = spec.occupation;
    user.gigType = spec.gigType;
    user.currency = 'LKR';
    user.language = 'en';
    user.emailVerifiedAt = user.emailVerifiedAt || new Date();
    user.demoSeedKey = DEMO_SEED_KEY;
    user.demoSeedAnchor = anchor;
    user.preferences = {
      ...(user.preferences?.toObject?.() || user.preferences || {}),
      notificationsEnabled: true,
      weekStartsOn: 1,
      timezone: 'Asia/Colombo',
      analyticsPeriod: 'week',
      analyticsCategories: ['Fuel', 'Food', 'Internet/Data'],
    };
    if (RESET_PASSWORDS) {
      user.passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
      passwordReset = true;
    }
    await user.save();
  }

  await SyncCursor.findOneAndUpdate(
    { ownerId: user._id },
    { $inc: { changeSeq: 1 }, lastPushAt: new Date() },
    { upsert: true }
  );

  return { user, passwordReset };
}

async function upsertByClient(Model, ownerId, clientId, doc) {
  const payload = {
    ...doc,
    ownerId,
    clientId,
    idempotencyKey: doc.idempotencyKey || `${DEMO_SEED_KEY}:${clientId}`,
    serverRevision: doc.serverRevision || 1,
    deletedAt: null,
  };
  const existing = await Model.findOne({ ownerId, clientId });
  if (!existing) {
    return Model.create(payload);
  }
  Object.assign(existing, payload, {
    serverRevision: (existing.serverRevision || 1) + 1,
  });
  await existing.save();
  return existing;
}

async function seedTaxonomy(ownerId, prefix) {
  const categories = {};
  let i = 0;
  for (const name of EXPENSE_CATS) {
    const clientId = `${prefix}-cat-exp-${slug(name)}`;
    const row = await upsertByClient(Category, ownerId, clientId, {
      name,
      kind: 'expense',
      color: COLORS[i % COLORS.length],
      isSystem: true,
      archived: false,
    });
    categories[`exp:${name}`] = row;
    i += 1;
  }
  for (const name of INCOME_CATS) {
    const clientId = `${prefix}-cat-inc-${slug(name)}`;
    const row = await upsertByClient(Category, ownerId, clientId, {
      name,
      kind: 'income',
      color: COLORS[i % COLORS.length],
      isSystem: true,
      archived: false,
    });
    categories[`inc:${name}`] = row;
    i += 1;
  }
  // demo custom categories
  const custom = await upsertByClient(Category, ownerId, `${prefix}-cat-exp-demo-tools`, {
    name: 'Demo Tools (custom)',
    kind: 'expense',
    color: '#63716D',
    isSystem: false,
    archived: false,
  });
  categories['exp:Demo Tools (custom)'] = custom;

  const platforms = {};
  for (const name of PLATFORM_NAMES) {
    const clientId = `${prefix}-plat-${slug(name)}`;
    platforms[name] = await upsertByClient(Platform, ownerId, clientId, {
      name,
      isSystem: true,
      archived: false,
    });
  }
  return { categories, platforms };
}

function buildHistoryTransactions({
  prefix,
  ownerKey,
  anchor,
  incomeCount,
  expenseCount,
  incomeCats,
  expenseCats,
  platforms,
  incomeBaseLkr,
  expenseBaseLkr,
}) {
  const rand = mulberry32(hashSeed(`${DEMO_SEED_KEY}:${ownerKey}:tx`));
  const rows = [];

  for (let i = 0; i < incomeCount; i += 1) {
    const dayOffset = 1 + Math.floor(rand() * 89); // yesterday back to ~90 days, not today
    const dateKey = addDaysKey(anchor, -dayOffset);
    const cat = incomeCats[Math.floor(rand() * incomeCats.length)];
    const plat = platforms[Math.floor(rand() * platforms.length)];
    const amountLkr = Math.round(incomeBaseLkr * (0.55 + rand() * 0.9));
    rows.push({
      clientId: `${prefix}-inc-${String(i).padStart(3, '0')}`,
      type: 'income',
      amountCents: lkrToCents(amountLkr),
      occurredAt: colomboDayStart(dateKey),
      categoryName: cat,
      categoryClientId: null, // filled later
      platformName: plat,
      paymentMethod: PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)],
      note: `DEMO income ${cat} via ${plat}`,
    });
  }

  for (let i = 0; i < expenseCount; i += 1) {
    const dayOffset = 1 + Math.floor(rand() * 89);
    const dateKey = addDaysKey(anchor, -dayOffset);
    const cat = expenseCats[Math.floor(rand() * expenseCats.length)];
    const amountLkr = Math.round(expenseBaseLkr * (0.35 + rand() * 1.4));
    // sprinkle a few larger loss-making days
    const bump = i % 17 === 0 ? 1.8 : 1;
    rows.push({
      clientId: `${prefix}-exp-${String(i).padStart(3, '0')}`,
      type: 'expense',
      amountCents: lkrToCents(Math.round(amountLkr * bump)),
      occurredAt: colomboDayStart(dateKey),
      categoryName: cat,
      categoryClientId: null,
      platformName: null,
      paymentMethod: PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)],
      note: `DEMO expense ${cat}`,
    });
  }

  return rows;
}

async function seedTransactions(ownerId, prefix, categories, platforms, rows) {
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    const key = `${row.type === 'income' ? 'inc' : 'exp'}:${row.categoryName}`;
    const cat = categories[key];
    const plat = row.platformName ? platforms[row.platformName] : null;
    await upsertByClient(Transaction, ownerId, row.clientId, {
      type: row.type,
      amountCents: row.amountCents,
      currency: 'LKR',
      occurredAt: row.occurredAt,
      categoryClientId: cat?.clientId,
      categoryName: row.categoryName,
      platformClientId: plat?.clientId,
      platformName: row.platformName || undefined,
      paymentMethod: row.paymentMethod,
      note: row.note,
      billClientId: row.billClientId,
      syncStatus: 'synced',
    });
    if (row.type === 'income') income += 1;
    else expense += 1;
  }
  return { income, expense };
}

async function seedMainToday(ownerId, prefix, categories, platforms, anchor) {
  const todayStart = colomboDayStart(anchor);
  const specs = [
    {
      clientId: `${prefix}-today-inc-1`,
      type: 'income',
      amountCents: lkrToCents(5500),
      categoryName: 'Ride',
      platformName: 'PickMe',
      paymentMethod: 'mobile_wallet',
      note: 'DEMO today rides total',
    },
    {
      clientId: `${prefix}-today-exp-fuel`,
      type: 'expense',
      amountCents: lkrToCents(1000),
      categoryName: 'Fuel',
      paymentMethod: 'cash',
      note: 'DEMO today fuel',
    },
    {
      clientId: `${prefix}-today-exp-food`,
      type: 'expense',
      amountCents: lkrToCents(500),
      categoryName: 'Food',
      paymentMethod: 'card',
      note: 'DEMO today food',
    },
    {
      clientId: `${prefix}-today-exp-data`,
      type: 'expense',
      amountCents: lkrToCents(300),
      categoryName: 'Internet/Data',
      paymentMethod: 'mobile_wallet',
      note: 'DEMO today data',
    },
  ];

  for (const s of specs) {
    const cat = categories[`${s.type === 'income' ? 'inc' : 'exp'}:${s.categoryName}`];
    const plat = s.platformName ? platforms[s.platformName] : null;
    await upsertByClient(Transaction, ownerId, s.clientId, {
      type: s.type,
      amountCents: s.amountCents,
      currency: 'LKR',
      occurredAt: todayStart,
      categoryClientId: cat?.clientId,
      categoryName: s.categoryName,
      platformClientId: plat?.clientId,
      platformName: s.platformName,
      paymentMethod: s.paymentMethod,
      note: s.note,
      syncStatus: 'synced',
    });
  }
}

async function seedBudgets(ownerId, prefix, categories, anchor, profile) {
  const { start, end } = monthBounds(anchor);
  const startDate = colomboDayStart(start);
  const endDate = new Date(`${end}T23:59:59+05:30`);
  const fuelCat = categories['exp:Fuel'];
  const foodCat = categories['exp:Food'];
  const dataCat = categories['exp:Internet/Data'];

  const defs =
    profile === 'main'
      ? [
          {
            clientId: `${prefix}-bud-overall`,
            name: 'Monthly overall',
            scope: 'overall',
            amountCents: lkrToCents(120000),
            alertThresholdPercent: 80,
          },
          {
            clientId: `${prefix}-bud-fuel`,
            name: 'Fuel budget',
            scope: 'category',
            categoryClientId: fuelCat.clientId,
            amountCents: lkrToCents(25000),
            alertThresholdPercent: 80,
          },
          {
            clientId: `${prefix}-bud-food`,
            name: 'Food budget',
            scope: 'category',
            categoryClientId: foodCat.clientId,
            amountCents: lkrToCents(18000),
            alertThresholdPercent: 80,
          },
          {
            clientId: `${prefix}-bud-data`,
            name: 'Data budget (tight)',
            scope: 'category',
            categoryClientId: dataCat.clientId,
            amountCents: lkrToCents(2500),
            alertThresholdPercent: 80,
          },
          {
            clientId: `${prefix}-bud-shopping`,
            name: 'Shopping (low limit)',
            scope: 'category',
            categoryClientId: categories['exp:Shopping'].clientId,
            amountCents: lkrToCents(3000),
            alertThresholdPercent: 75,
          },
        ]
      : [
          {
            clientId: `${prefix}-bud-overall`,
            name: 'Monthly overall',
            scope: 'overall',
            amountCents: lkrToCents(profile === 'kasun' ? 80000 : 60000),
            alertThresholdPercent: 80,
          },
          {
            clientId: `${prefix}-bud-cat`,
            name: profile === 'kasun' ? 'Fuel budget' : 'Food budget',
            scope: 'category',
            categoryClientId: (profile === 'kasun' ? fuelCat : foodCat).clientId,
            amountCents: lkrToCents(profile === 'kasun' ? 20000 : 12000),
            alertThresholdPercent: 80,
          },
        ];

  for (const d of defs) {
    await upsertByClient(Budget, ownerId, d.clientId, {
      name: d.name,
      scope: d.scope,
      categoryClientId: d.categoryClientId,
      amountCents: d.amountCents,
      currency: 'LKR',
      period: 'month',
      startDate,
      endDate,
      alertThresholdPercent: d.alertThresholdPercent,
    });
  }
  return defs.length;
}

async function seedSavings(ownerId, prefix, profile, anchor) {
  const goals =
    profile === 'main'
      ? [
          {
            clientId: `${prefix}-goal-bike`,
            name: 'Emergency Bike Repair',
            targetAmountCents: lkrToCents(40000),
            entries: [
              { clientId: `${prefix}-goal-bike-e1`, type: 'contribution', amountCents: lkrToCents(5000), daysAgo: 40 },
              { clientId: `${prefix}-goal-bike-e2`, type: 'contribution', amountCents: lkrToCents(3000), daysAgo: 20 },
            ],
          },
          {
            clientId: `${prefix}-goal-laptop`,
            name: 'New Laptop',
            targetAmountCents: lkrToCents(180000),
            entries: [
              { clientId: `${prefix}-goal-laptop-e1`, type: 'contribution', amountCents: lkrToCents(40000), daysAgo: 50 },
              { clientId: `${prefix}-goal-laptop-e2`, type: 'contribution', amountCents: lkrToCents(35000), daysAgo: 25 },
              { clientId: `${prefix}-goal-laptop-e3`, type: 'withdrawal', amountCents: lkrToCents(5000), daysAgo: 10 },
              { clientId: `${prefix}-goal-laptop-e4`, type: 'contribution', amountCents: lkrToCents(20000), daysAgo: 5 },
            ],
          },
          {
            clientId: `${prefix}-goal-edu`,
            name: 'Education Fund',
            targetAmountCents: lkrToCents(50000),
            entries: [
              { clientId: `${prefix}-goal-edu-e1`, type: 'contribution', amountCents: lkrToCents(20000), daysAgo: 60 },
              { clientId: `${prefix}-goal-edu-e2`, type: 'contribution', amountCents: lkrToCents(22000), daysAgo: 15 },
            ],
          },
          {
            clientId: `${prefix}-goal-ins`,
            name: 'Vehicle Insurance',
            targetAmountCents: lkrToCents(30000),
            entries: [
              { clientId: `${prefix}-goal-ins-e1`, type: 'contribution', amountCents: lkrToCents(15000), daysAgo: 45 },
              { clientId: `${prefix}-goal-ins-e2`, type: 'contribution', amountCents: lkrToCents(15000), daysAgo: 8 },
            ],
          },
        ]
      : [
          {
            clientId: `${prefix}-goal-1`,
            name: profile === 'kasun' ? 'Helmet Fund' : 'Course Fees',
            targetAmountCents: lkrToCents(20000),
            entries: [
              { clientId: `${prefix}-goal-1-e1`, type: 'contribution', amountCents: lkrToCents(8000), daysAgo: 20 },
            ],
          },
          {
            clientId: `${prefix}-goal-2`,
            name: profile === 'kasun' ? 'Phone Repair' : 'Tax Buffer',
            targetAmountCents: lkrToCents(15000),
            entries: [
              { clientId: `${prefix}-goal-2-e1`, type: 'contribution', amountCents: lkrToCents(15000), daysAgo: 12 },
            ],
          },
        ];

  for (const g of goals) {
    let balance = 0;
    const entries = g.entries.map((e) => {
      balance += e.type === 'contribution' ? e.amountCents : -e.amountCents;
      return {
        clientId: e.clientId,
        type: e.type,
        amountCents: e.amountCents,
        occurredAt: colomboDayStart(addDaysKey(anchor, -e.daysAgo)),
        note: `DEMO ${e.type}`,
        idempotencyKey: `${DEMO_SEED_KEY}:${e.clientId}`,
        serverRevision: 1,
        deletedAt: undefined,
      };
    });
    if (balance < 0) throw new Error(`Invalid savings balance for ${g.name}`);
    await upsertByClient(SavingsGoal, ownerId, g.clientId, {
      name: g.name,
      targetAmountCents: g.targetAmountCents,
      targetDate: colomboDayStart(addDaysKey(anchor, 60)),
      icon: 'flag',
      currency: 'LKR',
      balanceCents: balance,
      completedAt: balance >= g.targetAmountCents ? colomboDayStart(anchor) : null,
      entries,
    });
  }
  return goals.length;
}

async function seedBills(ownerId, prefix, categories, anchor, profile) {
  const bills =
    profile === 'main'
      ? [
          {
            clientId: `${prefix}-bill-overdue`,
            title: 'Electricity (overdue)',
            amountCents: lkrToCents(4200),
            dueKey: addDaysKey(anchor, -5),
            status: 'overdue',
            categoryName: 'Bills',
            recurrence: 'monthly',
          },
          {
            clientId: `${prefix}-bill-today`,
            title: 'Internet package (due today)',
            amountCents: lkrToCents(2900),
            dueKey: anchor,
            status: 'unpaid',
            categoryName: 'Internet/Data',
            recurrence: 'monthly',
          },
          {
            clientId: `${prefix}-bill-soon-1`,
            title: 'Phone reload reminder',
            amountCents: lkrToCents(1000),
            dueKey: addDaysKey(anchor, 3),
            status: 'unpaid',
            categoryName: 'Bills',
            recurrence: 'weekly',
          },
          {
            clientId: `${prefix}-bill-soon-2`,
            title: 'Water bill',
            amountCents: lkrToCents(1800),
            dueKey: addDaysKey(anchor, 10),
            status: 'unpaid',
            categoryName: 'Bills',
            recurrence: 'monthly',
          },
          {
            clientId: `${prefix}-bill-soon-3`,
            title: 'Vehicle service booking',
            amountCents: lkrToCents(7500),
            dueKey: addDaysKey(anchor, 18),
            status: 'unpaid',
            categoryName: 'Vehicle Maintenance',
            recurrence: 'none',
          },
          {
            clientId: `${prefix}-bill-paid`,
            title: 'Last month data (paid)',
            amountCents: lkrToCents(1500),
            dueKey: addDaysKey(anchor, -20),
            status: 'paid',
            categoryName: 'Internet/Data',
            recurrence: 'monthly',
            paid: true,
          },
          {
            clientId: `${prefix}-bill-rent`,
            title: 'Room rent share',
            amountCents: lkrToCents(15000),
            dueKey: addDaysKey(anchor, 7),
            status: 'unpaid',
            categoryName: 'Rent',
            recurrence: 'monthly',
          },
        ]
      : [
          {
            clientId: `${prefix}-bill-1`,
            title: profile === 'kasun' ? 'Fuel card top-up' : 'Adobe / tools',
            amountCents: lkrToCents(profile === 'kasun' ? 3000 : 4500),
            dueKey: addDaysKey(anchor, -2),
            status: 'overdue',
            categoryName: profile === 'kasun' ? 'Fuel' : 'Work Equipment',
            recurrence: 'monthly',
          },
          {
            clientId: `${prefix}-bill-2`,
            title: 'Data package',
            amountCents: lkrToCents(1500),
            dueKey: addDaysKey(anchor, 4),
            status: 'unpaid',
            categoryName: 'Internet/Data',
            recurrence: 'monthly',
          },
          {
            clientId: `${prefix}-bill-3`,
            title: 'Paid utility',
            amountCents: lkrToCents(2000),
            dueKey: addDaysKey(anchor, -12),
            status: 'paid',
            categoryName: 'Bills',
            recurrence: 'monthly',
            paid: true,
          },
        ];

  let count = 0;
  for (const b of bills) {
    const cat = categories[`exp:${b.categoryName}`];
    let linkedExpenseClientId;
    let paymentIdempotencyKey;
    let paidAt;
    if (b.paid) {
      linkedExpenseClientId = `${b.clientId}-expense`;
      paymentIdempotencyKey = `${DEMO_SEED_KEY}:${b.clientId}:pay`;
      paidAt = colomboDayStart(b.dueKey);
      await upsertByClient(Transaction, ownerId, linkedExpenseClientId, {
        type: 'expense',
        amountCents: b.amountCents,
        currency: 'LKR',
        occurredAt: paidAt,
        categoryClientId: cat?.clientId,
        categoryName: b.categoryName,
        paymentMethod: 'bank',
        note: `DEMO bill payment: ${b.title}`,
        billClientId: b.clientId,
        idempotencyKey: paymentIdempotencyKey,
        syncStatus: 'synced',
      });
    }
    const billDoc = {
      title: b.title,
      amountCents: b.amountCents,
      currency: 'LKR',
      dueAt: colomboDayStart(b.dueKey),
      categoryClientId: cat?.clientId,
      categoryName: b.categoryName,
      recurrence: b.recurrence,
      status: b.status,
      paidAt: paidAt || null,
      linkedExpenseClientId: linkedExpenseClientId || null,
      reminderEnabled: true,
    };
    if (paymentIdempotencyKey) billDoc.paymentIdempotencyKey = paymentIdempotencyKey;
    const existingBill = await Bill.findOne({ ownerId, clientId: b.clientId });
    if (existingBill && !paymentIdempotencyKey) {
      existingBill.paymentIdempotencyKey = undefined;
      existingBill.set('paymentIdempotencyKey', undefined);
    }
    await upsertByClient(Bill, ownerId, b.clientId, billDoc);
    if (!paymentIdempotencyKey) {
      await Bill.updateOne(
        { ownerId, clientId: b.clientId },
        { $unset: { paymentIdempotencyKey: 1 } }
      );
    }
    count += 1;
  }
  return count;
}

async function seedNotifications(ownerId, prefix, profile, anchor) {
  const items =
    profile === 'main'
      ? [
          {
            clientId: `${prefix}-ntf-budget-warn`,
            type: 'budget_threshold',
            title: 'Budget warning: Data',
            body: 'Data budget is near its alert threshold for this month.',
            relatedClientId: `${prefix}-bud-data`,
            readAt: null,
          },
          {
            clientId: `${prefix}-ntf-budget-over`,
            type: 'budget_threshold',
            title: 'Budget exceeded: Shopping',
            body: 'Shopping budget has been exceeded based on seeded expenses.',
            relatedClientId: `${prefix}-bud-shopping`,
            readAt: null,
          },
          {
            clientId: `${prefix}-ntf-bill-overdue`,
            type: 'bill_overdue',
            title: 'Overdue bill: Electricity',
            body: 'Electricity (overdue) is past its due date.',
            relatedClientId: `${prefix}-bill-overdue`,
            readAt: null,
          },
          {
            clientId: `${prefix}-ntf-bill-today`,
            type: 'bill_due',
            title: 'Bill due today',
            body: 'Internet package (due today) is due on the demo anchor date.',
            relatedClientId: `${prefix}-bill-today`,
            readAt: colomboDayStart(anchor),
          },
          {
            clientId: `${prefix}-ntf-savings`,
            type: 'savings_reminder',
            title: 'Savings progress: Education Fund',
            body: 'Education Fund is nearly at its target — keep contributing.',
            relatedClientId: `${prefix}-goal-edu`,
            readAt: null,
          },
          {
            clientId: `${prefix}-ntf-system`,
            type: 'system',
            title: 'Demo data loaded',
            body: 'Seeded GigBudget demo ledger for viva/demo walkthrough.',
            relatedClientId: null,
            readAt: colomboDayStart(anchor),
          },
        ]
      : [
          {
            clientId: `${prefix}-ntf-1`,
            type: 'bill_due',
            title: 'Upcoming bill',
            body: 'You have an upcoming bill in the demo account.',
            relatedClientId: `${prefix}-bill-2`,
            readAt: null,
          },
          {
            clientId: `${prefix}-ntf-2`,
            type: 'savings_reminder',
            title: 'Savings reminder',
            body: 'Add a contribution toward your demo savings goal.',
            relatedClientId: `${prefix}-goal-1`,
            readAt: colomboDayStart(anchor),
          },
        ];

  for (const n of items) {
    await upsertByClient(Notification, ownerId, n.clientId, {
      type: n.type,
      title: n.title,
      body: n.body,
      relatedClientId: n.relatedClientId || undefined,
      readAt: n.readAt || null,
      scheduledFor: null,
      dedupeKey: `${DEMO_SEED_KEY}:${n.clientId}`,
    });
  }
  return items.length;
}

async function countOwned(Model, ownerId) {
  return Model.countDocuments({ ownerId, deletedAt: null });
}

async function todayTotals(ownerId, anchor) {
  const from = colomboDayStart(anchor);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  const docs = await Transaction.find({
    ownerId,
    deletedAt: null,
    occurredAt: { $gte: from, $lt: to },
  }).lean();
  let incomeCents = 0;
  let expenseCents = 0;
  const seedOwned = { incomeCents: 0, expenseCents: 0 };
  for (const d of docs) {
    if (d.type === 'income') incomeCents += d.amountCents;
    else expenseCents += d.amountCents;
    if (String(d.clientId || '').includes('-today-') || String(d.note || '').startsWith('DEMO today')) {
      if (d.type === 'income') seedOwned.incomeCents += d.amountCents;
      else seedOwned.expenseCents += d.amountCents;
    }
  }
  return {
    incomeCents,
    expenseCents,
    profitCents: incomeCents - expenseCents,
    seedOwned,
    txCount: docs.length,
  };
}

async function seedAccount(spec, anchor) {
  const { user, passwordReset } = await ensureDemoUser(spec, anchor);
  const prefix = spec.prefix;
  const { categories, platforms } = await seedTaxonomy(user._id, prefix);

  const history = buildHistoryTransactions({
    prefix,
    ownerKey: spec.prefix,
    anchor,
    incomeCount: spec.incomeCount,
    expenseCount: spec.expenseCount,
    incomeCats: INCOME_CATS,
    expenseCats: EXPENSE_CATS,
    platforms: PLATFORM_NAMES,
    incomeBaseLkr: spec.incomeBaseLkr,
    expenseBaseLkr: spec.expenseBaseLkr,
  });

  const histCounts = await seedTransactions(
    user._id,
    prefix,
    categories,
    platforms,
    history
  );

  if (spec.profile === 'main') {
    await seedMainToday(user._id, prefix, categories, platforms, anchor);
    // Deterministic current-month spends for budget near/exceeded states
    const monthExtras = [
      { clientId: `${prefix}-m-shop-1`, cat: 'Shopping', lkr: 2200, daysAgo: 2 },
      { clientId: `${prefix}-m-shop-2`, cat: 'Shopping', lkr: 1500, daysAgo: 6 },
      { clientId: `${prefix}-m-data-1`, cat: 'Internet/Data', lkr: 2000, daysAgo: 4 },
      { clientId: `${prefix}-m-fuel-1`, cat: 'Fuel', lkr: 8000, daysAgo: 3 },
      { clientId: `${prefix}-m-food-1`, cat: 'Food', lkr: 4500, daysAgo: 1 },
    ];
    for (const x of monthExtras) {
      const cat = categories[`exp:${x.cat}`];
      await upsertByClient(Transaction, user._id, x.clientId, {
        type: 'expense',
        amountCents: lkrToCents(x.lkr),
        currency: 'LKR',
        occurredAt: colomboDayStart(addDaysKey(anchor, -x.daysAgo)),
        categoryClientId: cat?.clientId,
        categoryName: x.cat,
        paymentMethod: 'cash',
        note: `DEMO month ${x.cat}`,
        syncStatus: 'synced',
      });
    }
  }

  const budgetCount = await seedBudgets(user._id, prefix, categories, anchor, spec.profile);
  const goalCount = await seedSavings(user._id, prefix, spec.profile, anchor);
  const billCount = await seedBills(user._id, prefix, categories, anchor, spec.profile);
  const ntfCount = await seedNotifications(user._id, prefix, spec.profile, anchor);

  const totals = await todayTotals(user._id, anchor);

  return {
    email: spec.email,
    name: spec.name,
    userId: user._id.toString(),
    passwordReset,
    counts: {
      categories: await countOwned(Category, user._id),
      platforms: await countOwned(Platform, user._id),
      transactions: await countOwned(Transaction, user._id),
      incomes: await Transaction.countDocuments({ ownerId: user._id, type: 'income', deletedAt: null }),
      expenses: await Transaction.countDocuments({ ownerId: user._id, type: 'expense', deletedAt: null }),
      budgets: budgetCount,
      savingsGoals: goalCount,
      bills: billCount,
      notifications: ntfCount,
      historyIncome: histCounts.income,
      historyExpense: histCounts.expense,
    },
    today: totals,
  };
}

async function repairIdempotencyIndexes() {
  const mongoose = require('mongoose');
  const names = ['bills', 'transactions', 'categories', 'notifications'];
  for (const name of names) {
    try {
      const col = mongoose.connection.db.collection(name);
      const idxs = await col.indexes();
      for (const i of idxs) {
        if (/idempotency|dedupe/i.test(i.name)) {
          await col.dropIndex(i.name);
        }
      }
    } catch {
      // collection may not exist yet
    }
  }
}

async function main() {
  await connectDb();
  await repairIdempotencyIndexes();
  const anchor = colomboDateKey(new Date());
  const { start: monthStart, end: monthEnd } = monthBounds(anchor);
  const prev = prevMonthBounds(anchor);

  const accounts = [
    {
      prefix: 'sas',
      profile: 'main',
      name: 'Vihanga Sasmitha',
      email: 'sasmitha@gigbudget.example',
      phone: '+94770000001',
      occupation: 'ride_hailing_driver',
      gigType: 'Ride-hailing / PickMe',
      incomeCount: 65,
      expenseCount: 120,
      incomeBaseLkr: 2800,
      expenseBaseLkr: 650,
    },
    {
      prefix: 'kas',
      profile: 'kasun',
      name: 'Kasun Perera',
      email: 'kasun@gigbudget.example',
      phone: '+94770000002',
      occupation: 'delivery_rider',
      gigType: 'Delivery rider',
      incomeCount: 20,
      expenseCount: 32,
      incomeBaseLkr: 2200,
      expenseBaseLkr: 500,
    },
    {
      prefix: 'net',
      profile: 'nethmi',
      name: 'Nethmi Silva',
      email: 'nethmi@gigbudget.example',
      phone: '+94770000003',
      occupation: 'freelancer',
      gigType: 'Freelance design',
      incomeCount: 18,
      expenseCount: 28,
      incomeBaseLkr: 4500,
      expenseBaseLkr: 800,
    },
  ];

  const results = [];
  for (const a of accounts) {
    results.push(await seedAccount(a, anchor));
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: true,
        demoSeedKey: DEMO_SEED_KEY,
        demoDateAnchor: anchor,
        monthBounds: { start: monthStart, end: monthEnd },
        previousMonthBounds: prev,
        passwordResetMode: RESET_PASSWORDS ? 'SEED_RESET_DEMO_PASSWORDS=1 applied' : 'passwords preserved if users existed',
        note: 'Device PIN is local-only; suggest demo PIN 2580 during onboarding. Cloud password is separate.',
        accounts: results.map((r) => ({
          email: r.email,
          name: r.name,
          counts: r.counts,
          todayTotalsLkr: {
            income: r.today.incomeCents / 100,
            expenses: r.today.expenseCents / 100,
            profit: r.today.profitCents / 100,
            seedOwnedToday: {
              income: r.today.seedOwned.incomeCents / 100,
              expenses: r.today.seedOwned.expenseCents / 100,
              profit: (r.today.seedOwned.incomeCents - r.today.seedOwned.expenseCents) / 100,
            },
          },
          passwordReset: r.passwordReset,
        })),
      },
      null,
      2
    )
  );

  await disconnectDb();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('SEED_FAILED', err.message);
  try {
    await disconnectDb();
  } catch {
    // ignore
  }
  process.exit(1);
});
