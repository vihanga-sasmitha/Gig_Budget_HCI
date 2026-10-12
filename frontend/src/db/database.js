import * as SQLite from 'expo-sqlite';
import { newId } from '../utils/id';
import { colomboDateKey } from '../utils/dateColombo';

let dbPromise;
let activeDbFile = 'gigbudget.db';

/** Map vault key → SQLite filename. Legacy installs keep gigbudget.db. */
export function vaultFileName(vaultKey) {
  if (!vaultKey || vaultKey === 'legacy') return 'gigbudget.db';
  if (vaultKey === 'offline') return 'gigbudget_offline.db';
  return `gigbudget_${vaultKey}.db`;
}

export function getActiveDbFile() {
  return activeDbFile;
}

export async function closeDbConnection() {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      if (typeof db.closeAsync === 'function') await db.closeAsync();
    } catch {
      /* ignore close races */
    }
  }
  dbPromise = null;
}

/** Switch the mounted local vault. Does not delete other account databases. */
export async function switchVault(vaultKey) {
  const next = vaultFileName(vaultKey);
  if (dbPromise && activeDbFile === next) return getDb();
  await closeDbConnection();
  activeDbFile = next;
  return getDb();
}

const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS profile (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'LKR',
  language TEXT NOT NULL DEFAULT 'en',
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  platform TEXT
);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  category_id TEXT,
  note TEXT,
  platform TEXT,
  date_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  period TEXT NOT NULL DEFAULT 'month',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS savings_goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_cents INTEGER NOT NULL,
  current_cents INTEGER NOT NULL DEFAULT 0,
  deadline_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS savings_moves (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  move_type TEXT NOT NULL,
  date_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  due_key TEXT NOT NULL,
  recurrence TEXT,
  paid INTEGER NOT NULL DEFAULT 0,
  reminder_days INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_flag INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_pull_at TEXT,
  last_push_at TEXT,
  last_error TEXT
);
INSERT OR IGNORE INTO sync_state (id) VALUES (1);
`;

const EXPENSE_CATEGORIES = [
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

const INCOME_CATEGORIES = [
  'Delivery',
  'Freelancing',
  'Online Sales',
  'Ride',
  'Commission',
  'Bonus',
  'Tips',
  'Other',
];

const PLATFORMS = ['PickMe', 'Uber', 'Fiverr', 'Upwork', 'Daraz', 'Other'];

const CATEGORY_COLORS = [
  '#169E98',
  '#E1A32B',
  '#7B61FF',
  '#159B75',
  '#D95360',
  '#117C78',
];

function colorsPrimary() {
  return '#169E98';
}

function dateKeyFromIso(value) {
  if (!value) return colomboDateKey();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  try {
    return colomboDateKey(new Date(value));
  } catch {
    return colomboDateKey();
  }
}

export async function getDb() {
  if (!dbPromise) {
    const file = activeDbFile || 'gigbudget.db';
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(file);
      await db.execAsync(SCHEMA);
      await seedIfNeeded(db);
      return db;
    })();
  }
  return dbPromise;
}

async function seedIfNeeded(db) {
  const row = await db.getFirstAsync("SELECT value FROM meta WHERE key = 'seeded'");
  if (row?.value === '1') return;

  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT OR REPLACE INTO profile (id, name, currency, language, updated_at) VALUES (?, ?, ?, ?, ?)',
    'default',
    'Gig Worker',
    'LKR',
    'en',
    now
  );

  let ci = 0;
  for (const name of EXPENSE_CATEGORIES) {
    const id = `exp-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (id, name, kind, icon, color) VALUES (?, ?, ?, ?, ?)',
      id,
      name,
      'expense',
      'pricetag',
      CATEGORY_COLORS[ci % CATEGORY_COLORS.length]
    );
    ci += 1;
  }
  for (const name of INCOME_CATEGORIES) {
    const id = `inc-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (id, name, kind, icon, color) VALUES (?, ?, ?, ?, ?)',
      id,
      name,
      'income',
      'cash',
      CATEGORY_COLORS[ci % CATEGORY_COLORS.length]
    );
    ci += 1;
  }
  for (const platform of PLATFORMS) {
    const id = `plat-${platform.toLowerCase()}`;
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (id, name, kind, icon, color, platform) VALUES (?, ?, ?, ?, ?, ?)',
      id,
      platform,
      'platform',
      'globe',
      colorsPrimary(),
      platform
    );
  }

  await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', '1')");
}

async function enqueueOutbox(db, entity_type, entity_id, operation, payload) {
  const id = await newId();
  await db.runAsync(
    'INSERT INTO outbox (id, entity_type, entity_id, operation, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    entity_type,
    entity_id,
    operation,
    JSON.stringify(payload),
    new Date().toISOString()
  );
}

export async function getProfile() {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM profile WHERE id = ?', 'default');
}

export async function updateProfile(patch) {
  const db = await getDb();
  const current = await getProfile();
  const next = {
    name: patch.name ?? current?.name ?? 'Gig Worker',
    currency: patch.currency ?? current?.currency ?? 'LKR',
    language: patch.language ?? current?.language ?? 'en',
    updated_at: new Date().toISOString(),
  };
  await db.runAsync(
    'INSERT OR REPLACE INTO profile (id, name, currency, language, updated_at) VALUES (?, ?, ?, ?, ?)',
    'default',
    next.name,
    next.currency,
    next.language,
    next.updated_at
  );
  return getProfile();
}

function isSeedCategoryId(id) {
  return /^(exp|inc|plat)-/i.test(String(id || ''));
}

function dedupeCategoriesByName(rows, { platform = false } = {}) {
  // After cloud sync, seed ids and cloud ids can share a name/platform.
  // Prefer non-seed ids so UI chips/dropdowns and budgets stay aligned.
  const byKey = new Map();
  for (const row of rows) {
    const key = platform
      ? String(row.platform || row.name || '')
          .toLowerCase()
          .trim()
      : String(row.name || '')
          .toLowerCase()
          .trim();
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      continue;
    }
    if (isSeedCategoryId(prev.id) && !isSeedCategoryId(row.id)) {
      byKey.set(key, row);
    }
  }
  return [...byKey.values()].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''))
  );
}

export async function listCategories(kind) {
  const db = await getDb();
  const rows = kind
    ? await db.getAllAsync('SELECT * FROM categories WHERE kind = ? ORDER BY name ASC', kind)
    : await db.getAllAsync('SELECT * FROM categories ORDER BY name ASC');

  if (!kind) return rows;
  if (kind === 'platform') return dedupeCategoriesByName(rows, { platform: true });
  return dedupeCategoriesByName(rows);
}

export async function listPlatforms() {
  return listCategories('platform');
}

/** Resolve a stored category id to the preferred (deduped) id for the same name. */
export async function resolveCategoryId(categoryId, kind = 'expense') {
  if (!categoryId) return null;
  const cats = await listCategories(kind);
  if (cats.some((c) => c.id === categoryId)) return categoryId;
  const db = await getDb();
  const stored = await db.getFirstAsync('SELECT name, kind FROM categories WHERE id = ?', categoryId);
  if (!stored?.name) return categoryId;
  const match = cats.find(
    (c) => c.name?.toLowerCase() === stored.name.toLowerCase() && (!kind || c.kind === kind)
  );
  return match?.id || categoryId;
}

export async function createTransaction(input) {
  const db = await getDb();
  const id = await newId();
  const now = new Date().toISOString();
  const date_key = input.date_key || colomboDateKey();
  await db.runAsync(
    `INSERT INTO transactions (id, kind, amount_cents, category_id, note, platform, date_key, created_at, updated_at, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    id,
    input.kind,
    input.amount_cents,
    input.category_id || null,
    input.note || '',
    input.platform || null,
    date_key,
    now,
    now
  );
  const row = await db.getFirstAsync('SELECT * FROM transactions WHERE id = ?', id);
  await enqueueOutbox(db, 'transaction', id, 'create', row);
  return row;
}

export async function updateTransaction(id, patch) {
  const db = await getDb();
  const existing = await db.getFirstAsync('SELECT * FROM transactions WHERE id = ?', id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const row = {
    ...existing,
    ...patch,
    updated_at: now,
  };
  await db.runAsync(
    `UPDATE transactions SET kind = ?, amount_cents = ?, category_id = ?, note = ?, platform = ?, date_key = ?, updated_at = ?
     WHERE id = ?`,
    row.kind,
    row.amount_cents,
    row.category_id,
    row.note,
    row.platform,
    row.date_key,
    row.updated_at,
    id
  );
  const updated = await db.getFirstAsync('SELECT * FROM transactions WHERE id = ?', id);
  await enqueueOutbox(db, 'transaction', id, 'update', updated);
  return updated;
}

export async function deleteTransaction(id) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE transactions SET deleted = 1, updated_at = ? WHERE id = ?', now, id);
  await enqueueOutbox(db, 'transaction', id, 'delete', { id });
}

export async function getTransaction(id) {
  const db = await getDb();
  return db.getFirstAsync(
    `SELECT t.*, c.name as category_name, c.color as category_color
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.id = ? AND t.deleted = 0`,
    id
  );
}

export async function listTransactions({ kind, limit = 50, start, end } = {}) {
  const db = await getDb();
  let sql =
    'SELECT t.*, c.name as category_name, c.color as category_color FROM transactions t LEFT JOIN categories c ON c.id = t.category_id WHERE t.deleted = 0';
  const params = [];
  if (kind) {
    sql += ' AND t.kind = ?';
    params.push(kind);
  }
  if (start) {
    sql += ' AND t.date_key >= ?';
    params.push(start);
  }
  if (end) {
    sql += ' AND t.date_key <= ?';
    params.push(end);
  }
  sql += ' ORDER BY t.date_key DESC, t.created_at DESC LIMIT ?';
  params.push(limit);
  return db.getAllAsync(sql, ...params);
}

export async function sumTransactions({ kind, start, end } = {}) {
  const db = await getDb();
  let sql = 'SELECT COALESCE(SUM(amount_cents), 0) as total FROM transactions WHERE deleted = 0';
  const params = [];
  if (kind) {
    sql += ' AND kind = ?';
    params.push(kind);
  }
  if (start) {
    sql += ' AND date_key >= ?';
    params.push(start);
  }
  if (end) {
    sql += ' AND date_key <= ?';
    params.push(end);
  }
  const row = await db.getFirstAsync(sql, ...params);
  return row?.total || 0;
}

export async function spendingByCategory({ start, end }) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT c.name as name, COALESCE(SUM(t.amount_cents), 0) as total, c.color as color
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.deleted = 0 AND t.kind = 'expense' AND t.date_key >= ? AND t.date_key <= ?
     GROUP BY t.category_id
     ORDER BY total DESC`,
    start,
    end
  );
}

export async function monthlyPerformance(months = 6) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT substr(date_key, 1, 7) as month_key,
            SUM(CASE WHEN kind = 'income' THEN amount_cents ELSE 0 END) as income,
            SUM(CASE WHEN kind = 'expense' THEN amount_cents ELSE 0 END) as expense
     FROM transactions
     WHERE deleted = 0
     GROUP BY month_key
     ORDER BY month_key DESC
     LIMIT ?`,
    months
  );
  return rows;
}

export async function listBudgets() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT b.*,
       COALESCE(
         c.name,
         CASE
           WHEN b.category_id IS NULL OR b.category_id = '' OR b.category_id = 'overall'
             THEN 'Overall'
           ELSE b.category_id
         END
       ) as category_name
     FROM budgets b
     LEFT JOIN categories c ON c.id = b.category_id
     WHERE b.deleted = 0 ORDER BY b.updated_at DESC`
  );
}

export async function createBudget(input) {
  const db = await getDb();
  const id = await newId();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO budgets (id, category_id, amount_cents, period, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, 0)',
    id,
    input.category_id,
    input.amount_cents,
    input.period || 'month',
    now,
    now
  );
  const row = await db.getFirstAsync('SELECT * FROM budgets WHERE id = ?', id);
  await enqueueOutbox(db, 'budget', id, 'create', row);
  return row;
}

export async function updateBudget(id, patch) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE budgets SET category_id = ?, amount_cents = ?, period = ?, updated_at = ? WHERE id = ?',
    patch.category_id,
    patch.amount_cents,
    patch.period,
    now,
    id
  );
  const row = await db.getFirstAsync('SELECT * FROM budgets WHERE id = ?', id);
  await enqueueOutbox(db, 'budget', id, 'update', row);
  return row;
}

export async function deleteBudget(id) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE budgets SET deleted = 1, updated_at = ? WHERE id = ?', now, id);
  await enqueueOutbox(db, 'budget', id, 'delete', { id });
}

export async function budgetSpent(categoryId, start, end) {
  const db = await getDb();
  // Overall / unscoped budgets track every expense in the period.
  if (!categoryId || categoryId === 'overall') {
    const row = await db.getFirstAsync(
      `SELECT COALESCE(SUM(amount_cents), 0) as total FROM transactions
       WHERE deleted = 0 AND kind = 'expense' AND date_key >= ? AND date_key <= ?`,
      start,
      end
    );
    return row?.total || 0;
  }

  // Match the budget category id and any same-named expense category
  // (local seed id vs cloud-synced id after pull).
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(t.amount_cents), 0) as total
     FROM transactions t
     WHERE t.deleted = 0
       AND t.kind = 'expense'
       AND t.date_key >= ?
       AND t.date_key <= ?
       AND (
         t.category_id = ?
         OR t.category_id IN (
           SELECT c2.id FROM categories c2
           WHERE c2.kind = 'expense'
             AND lower(c2.name) = (
               SELECT lower(c1.name) FROM categories c1 WHERE c1.id = ?
             )
         )
       )`,
    start,
    end,
    categoryId,
    categoryId
  );
  return row?.total || 0;
}

export async function listSavingsGoals() {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM savings_goals WHERE deleted = 0 ORDER BY updated_at DESC');
}

export async function createSavingsGoal(input) {
  const db = await getDb();
  const id = await newId();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO savings_goals (id, name, target_cents, current_cents, deadline_key, created_at, updated_at, deleted) VALUES (?, ?, ?, 0, ?, ?, ?, 0)',
    id,
    input.name,
    input.target_cents,
    input.deadline_key || null,
    now,
    now
  );
  const row = await db.getFirstAsync('SELECT * FROM savings_goals WHERE id = ?', id);
  await enqueueOutbox(db, 'savings_goal', id, 'create', row);
  return row;
}

export async function updateSavingsGoal(id, patch) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE savings_goals SET name = ?, target_cents = ?, deadline_key = ?, updated_at = ? WHERE id = ?',
    patch.name,
    patch.target_cents,
    patch.deadline_key,
    now,
    id
  );
  const row = await db.getFirstAsync('SELECT * FROM savings_goals WHERE id = ?', id);
  await enqueueOutbox(db, 'savings_goal', id, 'update', row);
  return row;
}

export async function deleteSavingsGoal(id) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE savings_goals SET deleted = 1, updated_at = ? WHERE id = ?', now, id);
  await enqueueOutbox(db, 'savings_goal', id, 'delete', { id });
}

export async function addSavingsMove(goalId, amount_cents, move_type) {
  const db = await getDb();
  const goal = await db.getFirstAsync(
    'SELECT * FROM savings_goals WHERE id = ? AND deleted = 0',
    goalId
  );
  if (!goal) throw new Error('Goal not found');
  if (!Number.isInteger(amount_cents) || amount_cents < 1) {
    throw new Error('Invalid amount');
  }
  if (move_type === 'withdrawal' && amount_cents > goal.current_cents) {
    throw new Error('Withdrawal exceeds saved balance');
  }
  const id = await newId();
  const now = new Date().toISOString();
  const date_key = colomboDateKey();
  await db.runAsync(
    'INSERT INTO savings_moves (id, goal_id, amount_cents, move_type, date_key, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    goalId,
    amount_cents,
    move_type,
    date_key,
    now
  );
  const delta = move_type === 'withdrawal' ? -amount_cents : amount_cents;
  await db.runAsync(
    'UPDATE savings_goals SET current_cents = current_cents + ?, updated_at = ? WHERE id = ?',
    delta,
    now,
    goalId
  );
  const updatedGoal = await db.getFirstAsync('SELECT * FROM savings_goals WHERE id = ?', goalId);
  await enqueueOutbox(db, 'savings_move', id, 'create', { id, goalId, amount_cents, move_type });
  return updatedGoal;
}

export async function listBills() {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM bills WHERE deleted = 0 ORDER BY due_key ASC');
}

export async function createBill(input) {
  const db = await getDb();
  const id = await newId();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO bills (id, name, amount_cents, due_key, recurrence, paid, reminder_days, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)',
    id,
    input.name,
    input.amount_cents,
    input.due_key,
    input.recurrence || 'monthly',
    input.reminder_days ?? 1,
    now,
    now
  );
  const row = await db.getFirstAsync('SELECT * FROM bills WHERE id = ?', id);
  await enqueueOutbox(db, 'bill', id, 'create', row);
  await pushNotification(db, `Bill due: ${input.name}`, `Due on ${input.due_key}`);
  try {
    const { scheduleBillReminder } = await import('../notifications/localScheduler');
    await scheduleBillReminder(row);
  } catch {
    // ignore
  }
  return row;
}

export async function updateBill(id, patch) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE bills SET name = ?, amount_cents = ?, due_key = ?, recurrence = ?, reminder_days = ?, updated_at = ? WHERE id = ?',
    patch.name,
    patch.amount_cents,
    patch.due_key,
    patch.recurrence,
    patch.reminder_days,
    now,
    id
  );
  const row = await db.getFirstAsync('SELECT * FROM bills WHERE id = ?', id);
  await enqueueOutbox(db, 'bill', id, 'update', row);
  try {
    const { scheduleBillReminder } = await import('../notifications/localScheduler');
    await scheduleBillReminder(row);
  } catch {
    // ignore
  }
  return row;
}

export async function markBillPaid(id, paid = 1) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE bills SET paid = ?, updated_at = ? WHERE id = ?', paid, now, id);
  const row = await db.getFirstAsync('SELECT * FROM bills WHERE id = ?', id);
  await enqueueOutbox(db, 'bill', id, 'update', row);
  if (paid) {
    await pushNotification(db, 'Bill paid', row.name);
    try {
      const { cancelBillReminder } = await import('../notifications/localScheduler');
      await cancelBillReminder(id);
    } catch {
      // ignore
    }
  }
  return row;
}

export async function deleteBill(id) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE bills SET deleted = 1, updated_at = ? WHERE id = ?', now, id);
  await enqueueOutbox(db, 'bill', id, 'delete', { id });
  try {
    const { cancelBillReminder } = await import('../notifications/localScheduler');
    await cancelBillReminder(id);
  } catch {
    // ignore
  }
}

async function pushNotification(db, title, body) {
  const id = await newId();
  await db.runAsync(
    'INSERT INTO notifications (id, title, body, read_flag, created_at) VALUES (?, ?, ?, 0, ?)',
    id,
    title,
    body,
    new Date().toISOString()
  );
}

export async function listNotifications() {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100');
}

export async function markNotificationsRead() {
  const db = await getDb();
  await db.runAsync('UPDATE notifications SET read_flag = 1');
}

export async function getOutboxCount() {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT COUNT(*) as c FROM outbox');
  return row?.c || 0;
}

export async function getOutboxBatch(limit = 50) {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM outbox ORDER BY created_at ASC LIMIT ?', limit);
}

export async function clearOutboxIds(ids) {
  if (!ids?.length) return;
  const db = await getDb();
  for (const id of ids) {
    await db.runAsync('DELETE FROM outbox WHERE id = ?', id);
  }
}

export async function getSyncState() {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM sync_state WHERE id = 1');
}

export async function setSyncState(patch) {
  const db = await getDb();
  const current = await getSyncState();
  await db.runAsync(
    'UPDATE sync_state SET last_pull_at = ?, last_push_at = ?, last_error = ? WHERE id = 1',
    patch.last_pull_at ?? current?.last_pull_at,
    patch.last_push_at ?? current?.last_push_at,
    patch.last_error ?? current?.last_error
  );
  return getSyncState();
}

/**
 * Apply cloud sync/pull documents into local SQLite.
 * Accepts flat rows shaped as { collection, ...mongoFields } from syncClient.
 */
export async function applyPullRecords(records) {
  if (!records?.length) return;
  const db = await getDb();
  const now = new Date().toISOString();

  for (const rec of records) {
    const collection = rec.collection;
    const deleted = rec.deletedAt ? 1 : 0;
    const id = rec.clientId || rec.id;
    if (!id || !collection) continue;

    if (collection === 'categories') {
      await db.runAsync(
        'INSERT OR REPLACE INTO categories (id, name, kind, icon, color, platform) VALUES (?, ?, ?, ?, ?, ?)',
        id,
        rec.name || 'Category',
        rec.kind || 'expense',
        'pricetag',
        rec.color || colorsPrimary(),
        null
      );
      continue;
    }

    if (collection === 'platforms') {
      await db.runAsync(
        'INSERT OR REPLACE INTO categories (id, name, kind, icon, color, platform) VALUES (?, ?, ?, ?, ?, ?)',
        id,
        rec.name || 'Other',
        'platform',
        'globe',
        colorsPrimary(),
        rec.name || 'Other'
      );
      continue;
    }

    if (collection === 'transactions') {
      const kind = rec.type || rec.kind;
      if (!kind) continue;
      let categoryId = rec.categoryClientId || null;
      if (!categoryId && rec.categoryName) {
        const local = await db.getFirstAsync(
          'SELECT id FROM categories WHERE name = ? AND kind = ? LIMIT 1',
          rec.categoryName,
          kind === 'income' ? 'income' : 'expense'
        );
        categoryId = local?.id || null;
      }
      await db.runAsync(
        `INSERT OR REPLACE INTO transactions
          (id, kind, amount_cents, category_id, note, platform, date_key, created_at, updated_at, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        kind,
        rec.amountCents ?? rec.amount_cents ?? 0,
        categoryId,
        rec.note || '',
        rec.platformName || rec.platform || null,
        dateKeyFromIso(rec.occurredAt || rec.date_key),
        rec.createdAt || now,
        rec.updatedAt || now,
        deleted
      );
      continue;
    }

    if (collection === 'budgets') {
      await db.runAsync(
        `INSERT OR REPLACE INTO budgets
          (id, category_id, amount_cents, period, created_at, updated_at, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id,
        rec.categoryClientId || rec.category_id || 'overall',
        rec.amountCents ?? rec.amount_cents ?? 0,
        rec.period || 'month',
        rec.createdAt || now,
        rec.updatedAt || now,
        deleted
      );
      continue;
    }

    if (collection === 'savingsGoals') {
      await db.runAsync(
        `INSERT OR REPLACE INTO savings_goals
          (id, name, target_cents, current_cents, deadline_key, created_at, updated_at, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        rec.name || 'Goal',
        rec.targetAmountCents ?? rec.target_cents ?? 0,
        rec.balanceCents ?? rec.current_cents ?? 0,
        rec.targetDate ? dateKeyFromIso(rec.targetDate) : null,
        rec.createdAt || now,
        rec.updatedAt || now,
        deleted
      );
      if (Array.isArray(rec.entries)) {
        for (const e of rec.entries) {
          if (!e?.clientId || e.deletedAt) continue;
          await db.runAsync(
            `INSERT OR REPLACE INTO savings_moves
              (id, goal_id, amount_cents, move_type, date_key, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            e.clientId,
            id,
            e.amountCents,
            e.type,
            dateKeyFromIso(e.occurredAt),
            e.createdAt || now
          );
        }
      }
      continue;
    }

    if (collection === 'bills') {
      const dueKey = dateKeyFromIso(rec.dueAt || rec.due_key);
      await db.runAsync(
        `INSERT OR REPLACE INTO bills
          (id, name, amount_cents, due_key, recurrence, paid, reminder_days, created_at, updated_at, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        rec.title || rec.name || 'Bill',
        rec.amountCents ?? rec.amount_cents ?? 0,
        dueKey,
        rec.recurrence || 'none',
        rec.status === 'paid' || rec.paid ? 1 : 0,
        1,
        rec.createdAt || now,
        rec.updatedAt || now,
        deleted
      );
      // Schedule only unpaid future/near-due bills — not a burst of historical OS notifications.
      if (!deleted && rec.status !== 'paid' && !rec.paid) {
        try {
          const { scheduleBillReminder } = await import('../notifications/localScheduler');
          await scheduleBillReminder({
            id,
            name: rec.title || rec.name,
            due_key: dueKey,
            reminder_days: 1,
            paid: 0,
          });
        } catch {
          // ignore
        }
      }
      continue;
    }

    if (collection === 'notifications') {
      await db.runAsync(
        'INSERT OR REPLACE INTO notifications (id, title, body, read_flag, created_at) VALUES (?, ?, ?, ?, ?)',
        id,
        rec.title || 'Notification',
        rec.body || '',
        rec.readAt ? 1 : 0,
        rec.createdAt || now
      );
    }
  }
}

export async function exportTransactionsCsv() {
  const rows = await listTransactions({ limit: 10000 });
  const header = 'id,kind,amount_cents,date,category,note,platform\n';
  const body = rows
    .map(
      (r) =>
        `${r.id},${r.kind},${r.amount_cents},${r.date_key},"${(r.category_name || '').replace(/"/g, '""')}","${(r.note || '').replace(/"/g, '""')}",${r.platform || ''}`
    )
    .join('\n');
  return header + body;
}

export { PLATFORMS, EXPENSE_CATEGORIES, INCOME_CATEGORIES };
