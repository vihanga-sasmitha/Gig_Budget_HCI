import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/** Pre-scoping global keys (offline Gig Worker profile only after migration). */
export const LEGACY_GLOBAL_KEYS = {
  salt: 'gigbudget_pin_salt',
  hash: 'gigbudget_pin_hash',
  aesKey: 'gigbudget_vault_aes_key',
  biometrics: 'gigbudget_biometrics_enabled',
  failedAttempts: 'gigbudget_failed_attempts',
  lockoutUntil: 'gigbudget_lockout_until',
  onboarded: 'gigbudget_onboarded',
};

const MIGRATION_FLAG = 'gigbudget_pin_scope_migrated_v1';
const MIGRATION_TARGET = 'gigbudget_pin_scope_migrated_target';
const MIGRATION_PENDING = 'gigbudget_pin_scope_migration_pending';

const PBKDF2_ITERATIONS = 12000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;

/** Injectable store for regression tests (defaults to expo-secure-store). */
let store = SecureStore;

export function __setSecureStoreForTests(mockStore) {
  store = mockStore || SecureStore;
}

export function __resetSecureStoreForTests() {
  store = SecureStore;
}

function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * SecureStore keys may contain alphanumeric, `.`, `-`, `_` only (Expo SDK 57).
 * Reject missing/invalid scope — never fall back to global keys.
 */
export function assertVaultKey(vaultKey) {
  if (vaultKey == null || vaultKey === '') {
    const err = new Error('Vault key is required for security operations');
    err.code = 'VAULT_SCOPE_REQUIRED';
    throw err;
  }
  const key = String(vaultKey);
  if (!/^[A-Za-z0-9._-]+$/.test(key) || key.length > 180) {
    const err = new Error('Invalid vault key for SecureStore namespace');
    err.code = 'VAULT_SCOPE_INVALID';
    throw err;
  }
  return key;
}

export function scopedSecurityKeys(vaultKey) {
  const v = assertVaultKey(vaultKey);
  return {
    salt: `gigbudget_v_${v}_pin_salt`,
    hash: `gigbudget_v_${v}_pin_hash`,
    aesKey: `gigbudget_v_${v}_vault_aes_key`,
    biometrics: `gigbudget_v_${v}_biometrics_enabled`,
    failedAttempts: `gigbudget_v_${v}_failed_attempts`,
    lockoutUntil: `gigbudget_v_${v}_lockout_until`,
    onboarded: `gigbudget_v_${v}_onboarded`,
  };
}

/** Salted iterative SHA-256 (PBKDF2-like); raw PIN never persisted or sent to API */
export async function derivePinHash(pin, saltHex) {
  let value = `${saltHex}:${pin}`;
  for (let i = 0; i < PBKDF2_ITERATIONS; i++) {
    value = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
  }
  return value;
}

async function ensureVaultAesKey(vaultKey) {
  const keys = scopedSecurityKeys(vaultKey);
  let existing = await store.getItemAsync(keys.aesKey);
  if (existing) return existing;
  const bytes = await Crypto.getRandomBytesAsync(32);
  existing = bytesToHex(bytes);
  await store.setItemAsync(keys.aesKey, existing);
  return existing;
}

export async function hasLegacyGlobalPinConfigured() {
  const salt = await store.getItemAsync(LEGACY_GLOBAL_KEYS.salt);
  const hash = await store.getItemAsync(LEGACY_GLOBAL_KEYS.hash);
  return Boolean(salt && hash);
}

/**
 * Identify the original offline/legacy vault that owned the pre-scoping global PIN.
 * Never returns a cloud_* vault — cloud profiles must not inherit the offline PIN.
 */
export async function resolveOriginalOfflineVaultForMigration({
  getVaultOwnersMap,
  getLastOfflineVaultKey,
} = {}) {
  const map = getVaultOwnersMap ? await getVaultOwnersMap() : {};
  const remembered = getLastOfflineVaultKey ? await getLastOfflineVaultKey() : null;

  if (remembered && map[remembered]?.type === 'offline') return remembered;
  if (map.offline?.type === 'offline') return 'offline';
  if (map.legacy?.type === 'offline') return 'legacy';

  const offlineEntry = Object.entries(map).find(
    ([key, owner]) => owner?.type === 'offline' && !String(key).startsWith('cloud_')
  );
  if (offlineEntry) return offlineEntry[0];

  // Legacy install: vault file existed before owners were typed as cloud.
  if (map.legacy && map.legacy.type !== 'cloud') return 'legacy';

  if (remembered && !String(remembered).startsWith('cloud_')) return remembered;

  // Confirmed product history: global PIN belonged to the offline Gig Worker profile.
  if (await hasLegacyGlobalPinConfigured()) {
    return map.offline ? 'offline' : map.legacy ? 'legacy' : 'offline';
  }

  return null;
}

async function copyIfMissing(fromKey, toKey) {
  const existing = await store.getItemAsync(toKey);
  if (existing != null) return false;
  const value = await store.getItemAsync(fromKey);
  if (value == null) return false;
  await store.setItemAsync(toKey, value);
  return true;
}

/**
 * Versioned, interruption-safe migration: copy global security material to the
 * original offline vault only. Legacy keys are retained (not deleted).
 */
export async function migrateLegacyPinScopeIfNeeded(deps = {}) {
  const done = await store.getItemAsync(MIGRATION_FLAG);
  if (done === '1') {
    return {
      migrated: false,
      alreadyDone: true,
      target: await store.getItemAsync(MIGRATION_TARGET),
    };
  }

  const hasLegacy = await hasLegacyGlobalPinConfigured();
  if (!hasLegacy) {
    await store.setItemAsync(MIGRATION_FLAG, '1');
    await store.deleteItemAsync(MIGRATION_PENDING);
    return { migrated: false, noLegacy: true };
  }

  const target = await resolveOriginalOfflineVaultForMigration(deps);
  if (!target || String(target).startsWith('cloud_')) {
    await store.setItemAsync(MIGRATION_PENDING, '1');
    return { migrated: false, pending: true, reason: 'ambiguous_owner' };
  }

  const scoped = scopedSecurityKeys(target);
  // Copy credential material; do not overwrite vault-specific setup if already present.
  await copyIfMissing(LEGACY_GLOBAL_KEYS.salt, scoped.salt);
  await copyIfMissing(LEGACY_GLOBAL_KEYS.hash, scoped.hash);
  await copyIfMissing(LEGACY_GLOBAL_KEYS.aesKey, scoped.aesKey);
  await copyIfMissing(LEGACY_GLOBAL_KEYS.biometrics, scoped.biometrics);
  await copyIfMissing(LEGACY_GLOBAL_KEYS.failedAttempts, scoped.failedAttempts);
  await copyIfMissing(LEGACY_GLOBAL_KEYS.lockoutUntil, scoped.lockoutUntil);
  await copyIfMissing(LEGACY_GLOBAL_KEYS.onboarded, scoped.onboarded);

  // If legacy had a PIN but no onboarded flag, treat that offline vault as security-complete.
  const scopedPin = await store.getItemAsync(scoped.salt);
  const scopedHash = await store.getItemAsync(scoped.hash);
  if (scopedPin && scopedHash && (await store.getItemAsync(scoped.onboarded)) !== '1') {
    await store.setItemAsync(scoped.onboarded, '1');
  }

  await store.setItemAsync(MIGRATION_TARGET, target);
  await store.setItemAsync(MIGRATION_FLAG, '1');
  await store.deleteItemAsync(MIGRATION_PENDING);

  return { migrated: true, target, legacyRetained: true };
}

export async function setupPin(vaultKey, pin) {
  const keys = scopedSecurityKeys(vaultKey);
  if (!/^\d{4}$/.test(String(pin || ''))) {
    const err = new Error('PIN must be 4 digits');
    err.code = 'INVALID_PIN';
    throw err;
  }
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const saltHex = bytesToHex(saltBytes);
  const hash = await derivePinHash(pin, saltHex);
  await store.setItemAsync(keys.salt, saltHex);
  await store.setItemAsync(keys.hash, hash);
  await store.setItemAsync(keys.failedAttempts, '0');
  await store.deleteItemAsync(keys.lockoutUntil);
  await ensureVaultAesKey(vaultKey);
}

export async function hasPinConfigured(vaultKey) {
  const keys = scopedSecurityKeys(vaultKey);
  const salt = await store.getItemAsync(keys.salt);
  const hash = await store.getItemAsync(keys.hash);
  return Boolean(salt && hash);
}

export async function completeOnboarding(vaultKey) {
  const keys = scopedSecurityKeys(vaultKey);
  if (!(await hasPinConfigured(vaultKey))) {
    const err = new Error('Cannot complete security setup without a vault PIN');
    err.code = 'PIN_REQUIRED';
    throw err;
  }
  await store.setItemAsync(keys.onboarded, '1');
}

export async function isOnboarded(vaultKey) {
  const keys = scopedSecurityKeys(vaultKey);
  return (await store.getItemAsync(keys.onboarded)) === '1';
}

export async function verifyPin(vaultKey, pin) {
  const keys = scopedSecurityKeys(vaultKey);
  const lockoutUntil = await store.getItemAsync(keys.lockoutUntil);
  if (lockoutUntil) {
    const until = parseInt(lockoutUntil, 10);
    if (Date.now() < until) {
      return { ok: false, locked: true, retryAt: until };
    }
    await store.deleteItemAsync(keys.lockoutUntil);
    await store.setItemAsync(keys.failedAttempts, '0');
  }

  const salt = await store.getItemAsync(keys.salt);
  const stored = await store.getItemAsync(keys.hash);
  if (!salt || !stored) {
    return { ok: false, locked: false, reason: 'no_pin' };
  }

  const hash = await derivePinHash(pin, salt);
  if (hash === stored) {
    await store.setItemAsync(keys.failedAttempts, '0');
    return { ok: true };
  }

  const attempts = parseInt((await store.getItemAsync(keys.failedAttempts)) || '0', 10) + 1;
  await store.setItemAsync(keys.failedAttempts, String(attempts));
  if (attempts >= MAX_ATTEMPTS) {
    const retryAt = Date.now() + LOCKOUT_MS;
    await store.setItemAsync(keys.lockoutUntil, String(retryAt));
    return { ok: false, locked: true, retryAt };
  }
  return { ok: false, locked: false, attemptsLeft: MAX_ATTEMPTS - attempts };
}

export async function getLockoutState(vaultKey) {
  const keys = scopedSecurityKeys(vaultKey);
  const lockoutUntil = await store.getItemAsync(keys.lockoutUntil);
  if (!lockoutUntil) return { locked: false };
  const until = parseInt(lockoutUntil, 10);
  if (Date.now() >= until) {
    await store.deleteItemAsync(keys.lockoutUntil);
    await store.setItemAsync(keys.failedAttempts, '0');
    return { locked: false };
  }
  return { locked: true, retryAt: until };
}

export async function setBiometricsEnabled(vaultKey, enabled) {
  const keys = scopedSecurityKeys(vaultKey);
  await store.setItemAsync(keys.biometrics, enabled ? '1' : '0');
}

export async function isBiometricsEnabled(vaultKey) {
  const keys = scopedSecurityKeys(vaultKey);
  return (await store.getItemAsync(keys.biometrics)) === '1';
}

export async function getVaultAesKeyHex(vaultKey) {
  return ensureVaultAesKey(vaultKey);
}

export async function changePin(vaultKey, currentPin, newPin) {
  if (!/^\d{4}$/.test(String(newPin || ''))) {
    return { ok: false, reason: 'invalid_new_pin' };
  }
  const verified = await verifyPin(vaultKey, currentPin);
  if (!verified.ok) return { ...verified, reason: verified.reason || 'bad_current' };

  const keys = scopedSecurityKeys(vaultKey);
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const saltHex = bytesToHex(saltBytes);
  const hash = await derivePinHash(newPin, saltHex);
  await store.setItemAsync(keys.salt, saltHex);
  await store.setItemAsync(keys.hash, hash);
  await store.setItemAsync(keys.failedAttempts, '0');
  await store.deleteItemAsync(keys.lockoutUntil);
  await ensureVaultAesKey(vaultKey);
  return { ok: true };
}

/**
 * Authoritative security snapshot for a vault. Cloud DB/owner existence alone
 * does not imply PIN setup.
 */
export async function getSecuritySnapshot(vaultKey) {
  const key = assertVaultKey(vaultKey);
  const hasPin = await hasPinConfigured(key);
  const securityComplete = hasPin && (await isOnboarded(key));
  const biometricsEnabled = hasPin ? await isBiometricsEnabled(key) : false;
  let nextStep = 'create_pin';
  if (!hasPin) nextStep = 'create_pin';
  else if (!securityComplete) nextStep = 'biometrics';
  else nextStep = 'unlock';
  return {
    vaultKey: key,
    hasPin,
    securityComplete,
    biometricsEnabled,
    nextStep,
  };
}

/** Route after cloud/offline vault selection (uses snapshot, not React closures). */
export function resolvePostVaultAuthRoute(security, { cloudSession = false } = {}) {
  if (!security?.vaultKey) return '/welcome';
  if (!security.hasPin) return '/create-pin';
  if (!security.securityComplete) return '/biometrics';
  if (cloudSession && security.securityComplete) return '/login';
  return '/login';
}
