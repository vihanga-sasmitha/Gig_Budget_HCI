import Constants from 'expo-constants';
import * as Network from 'expo-network';
import {
  applyPullRecords,
  clearOutboxIds,
  getOutboxBatch,
  getSyncState,
  setSyncState,
} from '../db/database';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../api/authStorage';

function apiBase() {
  return (
    Constants.expoConfig?.extra?.apiUrl ||
    process.env.EXPO_PUBLIC_API_URL ||
    'http://10.0.2.2:4000/api'
  );
}

export async function isOnline() {
  const state = await Network.getNetworkStateAsync();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

async function authHeaders() {
  const token = await getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function refreshAccessIfNeeded(res) {
  if (res.status !== 401) return null;
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  const r = await fetch(`${apiBase()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!r.ok) {
    await clearTokens();
    return null;
  }
  const json = await r.json();
  await setTokens({ accessToken: json.data.accessToken });
  return json.data.accessToken;
}

function mapOutboxToSyncPayload(batch) {
  const payload = {
    transactions: [],
    categories: [],
    platforms: [],
    budgets: [],
    savingsGoals: [],
    bills: [],
    notifications: [],
  };

  for (const row of batch) {
    const body = JSON.parse(row.payload_json);
    const item = {
      ...body,
      clientId: body.clientId || body.id || row.entity_id,
      idempotencyKey: body.idempotencyKey || row.id,
      deletedAt: row.operation === 'delete' ? new Date().toISOString() : body.deletedAt || null,
    };

    switch (row.entity_type) {
      case 'transaction':
      case 'transactions':
        payload.transactions.push({
          ...item,
          type: item.type || item.kind,
          amountCents: item.amountCents ?? item.amount_cents,
          occurredAt: item.occurredAt || item.date_key || item.created_at,
          categoryName: item.categoryName || item.category_name,
          platformName: item.platformName || item.platform,
          note: item.note,
        });
        break;
      case 'category':
      case 'categories':
        payload.categories.push(item);
        break;
      case 'budget':
      case 'budgets':
        payload.budgets.push({
          ...item,
          amountCents: item.amountCents ?? item.amount_cents,
          categoryClientId: item.categoryClientId || item.category_id,
        });
        break;
      case 'savings_goal':
      case 'savingsGoals':
        payload.savingsGoals.push({
          ...item,
          targetAmountCents: item.targetAmountCents ?? item.target_cents,
          balanceCents: item.balanceCents ?? item.current_cents,
        });
        break;
      case 'bill':
      case 'bills':
        payload.bills.push({
          ...item,
          title: item.title || item.name,
          amountCents: item.amountCents ?? item.amount_cents,
          dueAt: item.dueAt || item.due_key,
        });
        break;
      case 'notification':
      case 'notifications':
        payload.notifications.push(item);
        break;
      default:
        break;
    }
  }
  return payload;
}

export async function runSync() {
  const online = await isOnline();
  if (!online) {
    await setSyncState({ last_error: 'offline' });
    return { ok: false, reason: 'offline' };
  }

  const token = await getAccessToken();
  if (!token) {
    await setSyncState({ last_error: 'cloud_auth_required' });
    return { ok: false, reason: 'cloud_auth_required' };
  }

  const base = apiBase();
  let pushOk = true;
  let pullOk = true;
  let error = null;

  try {
    const batch = await getOutboxBatch(100);
    if (batch.length) {
      let headers = await authHeaders();
      let res = await fetch(`${base}/sync/push`, {
        method: 'POST',
        headers,
        body: JSON.stringify(mapOutboxToSyncPayload(batch)),
      });
      if (res.status === 401) {
        const next = await refreshAccessIfNeeded(res);
        if (next) {
          headers = await authHeaders();
          res = await fetch(`${base}/sync/push`, {
            method: 'POST',
            headers,
            body: JSON.stringify(mapOutboxToSyncPayload(batch)),
          });
        }
      }
      if (res.ok) {
        await clearOutboxIds(batch.map((b) => b.id));
        await setSyncState({ last_push_at: new Date().toISOString(), last_error: null });
      } else {
        pushOk = false;
        error = `push ${res.status}`;
      }
    } else {
      await setSyncState({ last_push_at: new Date().toISOString(), last_error: null });
    }
  } catch (e) {
    pushOk = false;
    error = e.message || 'push failed';
  }

  try {
    // First cloud link: full pull (no since). Later: incremental from last successful pull.
    const syncState = await getSyncState();
    const since = syncState?.last_pull_at || null;
    const pullUrl = since
      ? `${base}/sync/pull?since=${encodeURIComponent(since)}`
      : `${base}/sync/pull`;
    let headers = await authHeaders();
    let res = await fetch(pullUrl, { headers });
    if (res.status === 401) {
      const next = await refreshAccessIfNeeded(res);
      if (next) {
        headers = await authHeaders();
        res = await fetch(pullUrl, { headers });
      }
    }
    if (res.ok) {
      const data = await res.json();
      const records = data.data?.data || data.data || {};
      const flat = [];
      Object.entries(records).forEach(([collection, rows]) => {
        (rows || []).forEach((r) => flat.push({ collection, ...r }));
      });
      await applyPullRecords(flat);
      await setSyncState({ last_pull_at: new Date().toISOString(), last_error: error });
    } else {
      pullOk = false;
      error = error || `pull ${res.status}`;
    }
  } catch (e) {
    pullOk = false;
    error = error || e.message || 'pull failed';
  }

  if (error) await setSyncState({ last_error: error });
  return { ok: pushOk && pullOk, error };
}
