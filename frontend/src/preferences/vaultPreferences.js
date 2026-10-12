import * as SecureStore from 'expo-secure-store';
import { DEFAULT_LEDGER_CURRENCY, isSupportedCurrency } from '../currency/currencies';

function key(vaultKey, suffix) {
  const v = vaultKey && String(vaultKey).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
  if (!v) return `gigbudget_pref_${suffix}`;
  return `gigbudget_v_${v}_${suffix}`;
}

export async function getVaultDisplayCurrency(vaultKey) {
  const raw = await SecureStore.getItemAsync(key(vaultKey, 'display_currency'));
  if (raw && isSupportedCurrency(raw)) return raw;
  return DEFAULT_LEDGER_CURRENCY;
}

export async function setVaultDisplayCurrency(vaultKey, code) {
  if (!isSupportedCurrency(code)) throw new Error('Unsupported currency');
  await SecureStore.setItemAsync(key(vaultKey, 'display_currency'), code);
  return code;
}

export async function getVaultAppearance(vaultKey) {
  return (await SecureStore.getItemAsync(key(vaultKey, 'appearance'))) || null;
}

export async function setVaultAppearance(vaultKey, mode) {
  if (!mode) {
    await SecureStore.deleteItemAsync(key(vaultKey, 'appearance'));
    return null;
  }
  const next = ['light', 'dark', 'system'].includes(mode) ? mode : 'system';
  await SecureStore.setItemAsync(key(vaultKey, 'appearance'), next);
  return next;
}

export const LEDGER_CURRENCY = DEFAULT_LEDGER_CURRENCY;
