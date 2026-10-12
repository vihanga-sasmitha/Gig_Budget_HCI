import * as SecureStore from 'expo-secure-store';

const KEYS = {
  cloudUser: 'gigbudget_cloud_user',
  onboardingPath: 'gigbudget_onboarding_path',
  onboardingStep: 'gigbudget_onboarding_step',
  activeVaultKey: 'gigbudget_active_vault',
  vaultOwners: 'gigbudget_vault_owners',
  pendingCloudCreds: 'gigbudget_pending_cloud',
  vaultMigrated: 'gigbudget_vault_migrated_v1',
  /** 'active' | 'account_selection' — survives restart; drives Welcome vs PIN */
  sessionMode: 'gigbudget_session_mode',
  lastOfflineVaultKey: 'gigbudget_last_offline_vault',
};

export const SESSION_ACTIVE = 'active';
export const SESSION_ACCOUNT_SELECTION = 'account_selection';

/**
 * Coherent session model:
 * - sessionMode account_selection → Welcome (even if PIN exists)
 * - sessionMode active + activeVaultKey → PIN unlock or Dashboard
 * - cloudSignedIn is independent of local vault lock
 */

export async function getSessionMode() {
  return (await SecureStore.getItemAsync(KEYS.sessionMode)) || null;
}

export async function setSessionMode(mode) {
  if (!mode) await SecureStore.deleteItemAsync(KEYS.sessionMode);
  else await SecureStore.setItemAsync(KEYS.sessionMode, mode);
}

export async function getLastOfflineVaultKey() {
  return SecureStore.getItemAsync(KEYS.lastOfflineVaultKey);
}

export async function setLastOfflineVaultKey(key) {
  if (!key) await SecureStore.deleteItemAsync(KEYS.lastOfflineVaultKey);
  else await SecureStore.setItemAsync(KEYS.lastOfflineVaultKey, key);
}

export async function getCloudUser() {
  const raw = await SecureStore.getItemAsync(KEYS.cloudUser);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setCloudUser(user) {
  if (!user) {
    await SecureStore.deleteItemAsync(KEYS.cloudUser);
    return;
  }
  await SecureStore.setItemAsync(
    KEYS.cloudUser,
    JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
    })
  );
}

export async function clearCloudUser() {
  await SecureStore.deleteItemAsync(KEYS.cloudUser);
}

export async function getOnboardingPath() {
  return SecureStore.getItemAsync(KEYS.onboardingPath);
}

export async function setOnboardingPath(path) {
  if (!path) await SecureStore.deleteItemAsync(KEYS.onboardingPath);
  else await SecureStore.setItemAsync(KEYS.onboardingPath, path);
}

export async function getOnboardingStep() {
  return (await SecureStore.getItemAsync(KEYS.onboardingStep)) || 'welcome';
}

export async function setOnboardingStep(step) {
  await SecureStore.setItemAsync(KEYS.onboardingStep, step || 'welcome');
}

export async function clearOnboardingProgress() {
  await SecureStore.deleteItemAsync(KEYS.onboardingPath);
  await SecureStore.deleteItemAsync(KEYS.onboardingStep);
  await SecureStore.deleteItemAsync(KEYS.pendingCloudCreds);
}

export async function getActiveVaultKey() {
  return SecureStore.getItemAsync(KEYS.activeVaultKey);
}

export async function setActiveVaultKey(key) {
  if (!key) await SecureStore.deleteItemAsync(KEYS.activeVaultKey);
  else await SecureStore.setItemAsync(KEYS.activeVaultKey, key);
}

/** One-time migration for installs that predate account-scoped vault keys. */
export async function consumeLegacyVaultMigration() {
  const done = await SecureStore.getItemAsync(KEYS.vaultMigrated);
  if (done === '1') return false;
  await SecureStore.setItemAsync(KEYS.vaultMigrated, '1');
  return true;
}

async function readOwners() {
  const raw = await SecureStore.getItemAsync(KEYS.vaultOwners);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeOwners(map) {
  await SecureStore.setItemAsync(KEYS.vaultOwners, JSON.stringify(map));
}

export async function getVaultOwnersMap() {
  return readOwners();
}

export async function getVaultOwner(vaultKey) {
  const map = await readOwners();
  return map[vaultKey] || null;
}

export async function setVaultOwner(vaultKey, owner) {
  const map = await readOwners();
  map[vaultKey] = owner;
  await writeOwners(map);
}

/** Find a vault previously owned by this cloud user id. */
export async function findVaultKeyForCloudUser(userId) {
  const map = await readOwners();
  const entry = Object.entries(map).find(
    ([, owner]) => owner?.type === 'cloud' && owner?.id === userId
  );
  return entry?.[0] || null;
}

/** Prefer dedicated offline vault, then legacy offline, then last remembered. */
export async function findResumableOfflineVaultKey() {
  const remembered = await getLastOfflineVaultKey();
  const map = await readOwners();
  if (remembered && map[remembered]?.type === 'offline') return remembered;
  if (map.offline?.type === 'offline') return 'offline';
  if (map.legacy?.type === 'offline') return 'legacy';
  const any = Object.entries(map).find(([, owner]) => owner?.type === 'offline');
  return any?.[0] || remembered || null;
}

export function cloudVaultKey(userId) {
  return `cloud_${userId}`;
}

export async function setPendingCloudSession(payload) {
  await SecureStore.setItemAsync(KEYS.pendingCloudCreds, JSON.stringify(payload));
}

export async function getPendingCloudSession() {
  const raw = await SecureStore.getItemAsync(KEYS.pendingCloudCreds);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearPendingCloudSession() {
  await SecureStore.deleteItemAsync(KEYS.pendingCloudCreds);
}

/**
 * Resolve expo-router href for cold start / resume.
 * Wait for hydration before calling — never assume defaults.
 */
export function resolveLaunchHref({
  ready,
  sessionMode,
  securityComplete,
  unlocked,
  activeVaultKey,
  onboardingStep,
  onboardingPath,
  hasPin,
}) {
  if (!ready) return null;

  // Explicit logout / account picker — never force PIN merely because another profile has one.
  if (sessionMode === SESSION_ACCOUNT_SELECTION || (!activeVaultKey && securityComplete)) {
    return '/welcome';
  }

  // Active vault with incomplete vault-scoped security (e.g. cloud DB from buggy flow).
  if (
    activeVaultKey &&
    sessionMode !== SESSION_ACCOUNT_SELECTION &&
    !securityComplete
  ) {
    if (hasPin && onboardingStep === 'initial_sync') return '/initial-sync';
    if (hasPin) return '/biometrics';
    if (onboardingStep === 'sign_in') return '/sign-in';
    if (onboardingStep === 'register') return '/register';
    return '/create-pin';
  }

  if (securityComplete && activeVaultKey && sessionMode !== SESSION_ACCOUNT_SELECTION) {
    if (!unlocked) return '/login';
    return '/(tabs)';
  }

  if (hasPin && onboardingPath === 'cloud' && onboardingStep === 'initial_sync') {
    return '/initial-sync';
  }
  if (hasPin && (onboardingStep === 'biometrics' || onboardingStep === 'confirm_pin')) {
    return '/biometrics';
  }
  if (onboardingStep === 'create_pin' || onboardingStep === 'confirm_pin') {
    return '/create-pin';
  }
  if (onboardingStep === 'offline_profile') return '/offline-profile';
  if (onboardingStep === 'sign_in') return '/sign-in';
  if (onboardingStep === 'register') return '/register';
  if (onboardingStep === 'initial_sync') return '/initial-sync';
  return '/welcome';
}