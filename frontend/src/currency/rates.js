/**
 * Exchange-rate cache + conversion (display only).
 *
 * Architecture:
 * - Ledger amounts stay in integer cents of the vault ledger currency (usually LKR).
 * - Display currency converts using rates quoted as units of TARGET per 1 BASE (ledger).
 * - Switching display currency never mutates stored cents.
 *
 * Rates are served by the GigBudget backend (`GET /api/fx/rates`) so secrets stay server-side.
 * Offline: last successful snapshot is used; stale snapshots are labelled in UI.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiBase } from '../api/authApi';
import { DEFAULT_LEDGER_CURRENCY } from './currencies';

const CACHE_KEY = 'gigbudget_fx_rates_v1';
const STALE_MS = 24 * 60 * 60 * 1000;

/** Bundled fallback snapshot (documented demo baseline — not a live market feed). */
export const BUNDLED_RATE_SNAPSHOT = {
  base: 'LKR',
  asOf: '2026-10-01T00:00:00.000Z',
  source: 'gigbudget-bundled-demo-snapshot',
  /** Units of each currency per 1 LKR */
  rates: {
    LKR: 1,
    USD: 0.00333,
    EUR: 0.00305,
    GBP: 0.0026,
    INR: 0.278,
    AUD: 0.00505,
  },
};

let memorySnapshot = null;

export async function loadCachedRates() {
  if (memorySnapshot) return memorySnapshot;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      memorySnapshot = JSON.parse(raw);
      return memorySnapshot;
    }
  } catch {
    // ignore
  }
  memorySnapshot = { ...BUNDLED_RATE_SNAPSHOT, offlineFallback: true };
  return memorySnapshot;
}

export async function saveCachedRates(snapshot) {
  memorySnapshot = snapshot;
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore
  }
  return snapshot;
}

export function isRateSnapshotStale(snapshot, now = Date.now()) {
  if (!snapshot?.asOf) return true;
  const t = Date.parse(snapshot.asOf);
  if (Number.isNaN(t)) return true;
  return now - t > STALE_MS;
}

/**
 * Fetch rates from backend; fall back to cache / bundled snapshot.
 */
export async function refreshRates({ ledgerCurrency = DEFAULT_LEDGER_CURRENCY } = {}) {
  try {
    const res = await fetch(`${apiBase()}/fx/rates?base=${encodeURIComponent(ledgerCurrency)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
    const json = await res.json();
    const data = json.data || json;
    if (!data?.rates || !data?.base) throw new Error('Invalid FX payload');
    return saveCachedRates({
      base: data.base,
      rates: data.rates,
      asOf: data.asOf || new Date().toISOString(),
      source: data.source || 'gigbudget-api',
      offlineFallback: false,
    });
  } catch (e) {
    const cached = await loadCachedRates();
    return {
      ...cached,
      fetchError: e.message || 'network',
      offlineFallback: true,
    };
  }
}

/**
 * Convert ledger cents → display cents using snapshot rates.
 * rates[code] = units of code per 1 unit of snapshot.base (ledger).
 */
export function convertCents(ledgerCents, { from = DEFAULT_LEDGER_CURRENCY, to, snapshot }) {
  const snap = snapshot || BUNDLED_RATE_SNAPSHOT;
  if (!to || to === from) {
    return { cents: Math.round(ledgerCents), rate: 1, ok: true };
  }
  if (snap.base !== from) {
    return { cents: Math.round(ledgerCents), rate: null, ok: false, reason: 'base_mismatch' };
  }
  const rate = snap.rates?.[to];
  if (typeof rate !== 'number' || !(rate > 0)) {
    return { cents: Math.round(ledgerCents), rate: null, ok: false, reason: 'missing_rate' };
  }
  // ledgerCents * rate, round half-away-from-zero for display
  const raw = ledgerCents * rate;
  const cents = raw >= 0 ? Math.round(raw) : -Math.round(-raw);
  return { cents, rate, ok: true };
}

export function describeRateBasis(snapshot, ledgerCurrency, displayCurrency) {
  if (!snapshot) return null;
  if (ledgerCurrency === displayCurrency) {
    return {
      converted: false,
      ledgerCurrency,
      displayCurrency,
      source: snapshot.source,
      asOf: snapshot.asOf,
      stale: isRateSnapshotStale(snapshot),
    };
  }
  const rate = snapshot.rates?.[displayCurrency];
  return {
    converted: true,
    ledgerCurrency,
    displayCurrency,
    rate,
    direction: `1 ${ledgerCurrency} = ${rate} ${displayCurrency}`,
    source: snapshot.source,
    asOf: snapshot.asOf,
    stale: isRateSnapshotStale(snapshot),
    offlineFallback: Boolean(snapshot.offlineFallback),
  };
}
