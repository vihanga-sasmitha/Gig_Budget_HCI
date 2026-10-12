import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Alert } from 'react-native';
import {
  getDb,
  getProfile,
  getOutboxCount,
  getSyncState,
  switchVault,
  closeDbConnection,
} from '../db/database';
import {
  getSecuritySnapshot,
  migrateLegacyPinScopeIfNeeded,
  completeOnboarding,
  hasLegacyGlobalPinConfigured,
} from '../security/pinVault';
import { isOnline, runSync } from '../sync/syncClient';
import { clearTokens, getAccessToken, getRefreshToken, hasCloudSession, setTokens } from '../api/authStorage';
import { logoutRequest } from '../api/authApi';
import {
  getCloudUser,
  setCloudUser,
  clearCloudUser,
  getActiveVaultKey,
  setActiveVaultKey,
  getVaultOwner,
  setVaultOwner,
  getVaultOwnersMap,
  findVaultKeyForCloudUser,
  findResumableOfflineVaultKey,
  cloudVaultKey,
  getOnboardingPath,
  getOnboardingStep,
  setOnboardingPath,
  setOnboardingStep,
  clearOnboardingProgress,
  clearPendingCloudSession,
  consumeLegacyVaultMigration,
  getSessionMode,
  setSessionMode,
  setLastOfflineVaultKey,
  getLastOfflineVaultKey,
  SESSION_ACTIVE,
  SESSION_ACCOUNT_SELECTION,
} from '../api/sessionStorage';
import { t } from '../i18n';
import {
  getVaultDisplayCurrency,
  setVaultDisplayCurrency,
  getVaultAppearance,
  setVaultAppearance,
  LEDGER_CURRENCY,
} from '../preferences/vaultPreferences';
import { refreshRates, loadCachedRates, BUNDLED_RATE_SNAPSHOT } from '../currency/rates';
import { DEFAULT_LEDGER_CURRENCY } from '../currency/currencies';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [profile, setProfile] = useState(null);
  const [online, setOnline] = useState(true);
  const [syncMeta, setSyncMeta] = useState(null);
  const [outboxCount, setOutboxCount] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [cloudUser, setCloudUserState] = useState(null);
  const [cloudSignedIn, setCloudSignedIn] = useState(false);
  const [activeVaultKey, setActiveVaultKeyState] = useState(null);
  const [onboardingPath, setOnboardingPathState] = useState(null);
  const [onboardingStep, setOnboardingStepState] = useState('welcome');
  const [hasPin, setHasPin] = useState(false);
  const [syncPausedReason, setSyncPausedReason] = useState(null);
  const [sessionMode, setSessionModeState] = useState(null);
  const [hasOfflineProfile, setHasOfflineProfile] = useState(false);
  const [displayCurrency, setDisplayCurrencyState] = useState(DEFAULT_LEDGER_CURRENCY);
  const [ledgerCurrency] = useState(LEDGER_CURRENCY);
  const [fxSnapshot, setFxSnapshot] = useState(BUNDLED_RATE_SNAPSHOT);
  const [vaultAppearanceMode, setVaultAppearanceModeState] = useState(null);
  const appState = useRef(AppState.currentState);
  /** Bumped on logout / account switch so late async work is ignored. */
  const sessionEpoch = useRef(0);

  const bumpEpoch = useCallback(() => {
    sessionEpoch.current += 1;
    return sessionEpoch.current;
  }, []);

  const isCurrentEpoch = useCallback((epoch) => epoch === sessionEpoch.current, []);

  const clearMemoryState = useCallback(() => {
    setProfile(null);
    setOutboxCount(0);
    setSyncMeta(null);
    setUnlocked(false);
    setSyncPausedReason(null);
    setDisplayCurrencyState(DEFAULT_LEDGER_CURRENCY);
    setVaultAppearanceModeState(null);
  }, []);

  const loadVaultPreferences = useCallback(async (vaultKey) => {
    if (!vaultKey) {
      setDisplayCurrencyState(DEFAULT_LEDGER_CURRENCY);
      setVaultAppearanceModeState(null);
      const snap = await loadCachedRates();
      setFxSnapshot(snap);
      return;
    }
    const [currency, appearance, snap] = await Promise.all([
      getVaultDisplayCurrency(vaultKey),
      getVaultAppearance(vaultKey),
      refreshRates({ ledgerCurrency: LEDGER_CURRENCY }),
    ]);
    setDisplayCurrencyState(currency);
    setVaultAppearanceModeState(appearance);
    setFxSnapshot(snap);
  }, []);

  const setDisplayCurrency = useCallback(
    async (code) => {
      const vault = (await getActiveVaultKey()) || activeVaultKey;
      if (!vault) return;
      const next = await setVaultDisplayCurrency(vault, code);
      setDisplayCurrencyState(next);
      // Mirror preference onto local profile.currency for sync (display-only; no amount rewrite).
      try {
        const { updateProfile } = await import('../db/database');
        await updateProfile({ currency: next });
        await refresh();
      } catch {
        setRefreshToken((x) => x + 1);
      }
      return next;
    },
    [activeVaultKey, refresh]
  );

  const setVaultAppearancePreference = useCallback(
    async (mode) => {
      const vault = (await getActiveVaultKey()) || activeVaultKey;
      if (!vault) {
        setVaultAppearanceModeState(mode);
        return mode;
      }
      const next = await setVaultAppearance(vault, mode);
      setVaultAppearanceModeState(next);
      return next;
    },
    [activeVaultKey]
  );

  const refresh = useCallback(async () => {
    const vault = await getActiveVaultKey();
    if (!vault) {
      setProfile(null);
      setOutboxCount(0);
      setSyncMeta(null);
      setOnline(await isOnline());
      setRefreshToken((x) => x + 1);
      return;
    }
    await getDb();
    const p = await getProfile();
    setProfile(p);
    setOutboxCount(await getOutboxCount());
    setSyncMeta(await getSyncState());
    setOnline(await isOnline());
    setRefreshToken((x) => x + 1);
  }, []);

  const refreshOfflineAvailability = useCallback(async () => {
    const key = await findResumableOfflineVaultKey();
    setHasOfflineProfile(Boolean(key));
    return key;
  }, []);

  const applySecuritySnapshot = useCallback((security) => {
    if (!security) {
      setHasPin(false);
      setOnboardingComplete(false);
      setBiometricsEnabled(false);
      return;
    }
    setHasPin(Boolean(security.hasPin));
    setOnboardingComplete(Boolean(security.securityComplete));
    setBiometricsEnabled(Boolean(security.biometricsEnabled));
  }, []);

  /**
   * Mount a vault and return its authoritative security snapshot.
   * Clears unlock state first so stale async work cannot expose the prior profile.
   */
  const activateVault = useCallback(
    async (vaultKey, { refreshFinancial = false } = {}) => {
      // Clear prior unlock/UI state, but do not bump sessionEpoch here — callers
      // (sign-in/register) keep their epoch across logout-safe vault activation.
      setUnlocked(false);
      clearMemoryState();

      await setActiveVaultKey(vaultKey);
      await setSessionMode(SESSION_ACTIVE);
      await switchVault(vaultKey);
      setActiveVaultKeyState(vaultKey);
      setSessionModeState(SESSION_ACTIVE);

      const security = await getSecuritySnapshot(vaultKey);
      applySecuritySnapshot(security);
      await loadVaultPreferences(vaultKey);

      // Avoid syncing/pulling into UI until unlocked or first-time PIN setup proceeds.
      if (refreshFinancial && security.securityComplete === false && !security.hasPin) {
        // New vault seed/categories only — not treated as unlocked financial access.
        await refresh();
      } else if (refreshFinancial && security.securityComplete) {
        // Profile meta may load while still locked; screens stay guarded by unlocked.
        await refresh();
      }

      return { vaultKey, ...security };
    },
    [clearMemoryState, applySecuritySnapshot, refresh, loadVaultPreferences]
  );

  const hydrateSession = useCallback(async () => {
    await migrateLegacyPinScopeIfNeeded({
      getVaultOwnersMap,
      getLastOfflineVaultKey,
    });

    const hadDeviceSecurity =
      (await hasLegacyGlobalPinConfigured()) ||
      Boolean(await findResumableOfflineVaultKey());

    let vaultKey = await getActiveVaultKey();
    let mode = await getSessionMode();
    const user = await getCloudUser();
    const signedIn = await hasCloudSession();
    const path = await getOnboardingPath();
    const step = await getOnboardingStep();

    // One-time DB vault-key migration when not already logged out.
    if (hadDeviceSecurity && !vaultKey && mode !== SESSION_ACCOUNT_SELECTION) {
      const shouldMigrate = await consumeLegacyVaultMigration();
      if (shouldMigrate) {
        vaultKey = 'legacy';
        await setActiveVaultKey('legacy');
        await setSessionMode(SESSION_ACTIVE);
        mode = SESSION_ACTIVE;
        const owner = await getVaultOwner('legacy');
        if (!owner) {
          await setVaultOwner(
            'legacy',
            user?.id
              ? { type: 'cloud', id: user.id, email: user.email, sealed: false }
              : { type: 'offline', id: 'offline', sealed: false }
          );
        }
        if (!user?.id) {
          await setLastOfflineVaultKey('legacy');
        }
        // Re-run PIN migration now that offline ownership is recorded.
        await migrateLegacyPinScopeIfNeeded({
          getVaultOwnersMap,
          getLastOfflineVaultKey,
        });
      }
    }

    if (mode === SESSION_ACCOUNT_SELECTION) {
      vaultKey = null;
      await setActiveVaultKey(null);
      await closeDbConnection();
      setUnlocked(false);
      applySecuritySnapshot(null);
    } else if (vaultKey) {
      if (!mode) {
        await setSessionMode(SESSION_ACTIVE);
        mode = SESSION_ACTIVE;
      }
      await switchVault(vaultKey);
      const security = await getSecuritySnapshot(vaultKey);
      applySecuritySnapshot(security);
    } else {
      await closeDbConnection();
      applySecuritySnapshot(null);
      if (hadDeviceSecurity && !mode) {
        await setSessionMode(SESSION_ACCOUNT_SELECTION);
        mode = SESSION_ACCOUNT_SELECTION;
      }
    }

    setCloudUserState(user);
    setCloudSignedIn(Boolean(signedIn && user));
    setActiveVaultKeyState(vaultKey);
    setOnboardingPathState(path);
    setOnboardingStepState(step);
    setSessionModeState(mode);

    if (signedIn && !user) {
      await clearTokens();
      setCloudSignedIn(false);
    }

    if (!signedIn && user) {
      setSyncPausedReason('cloud_session_expired');
    } else {
      setSyncPausedReason(null);
    }

    await refreshOfflineAvailability();
    if (vaultKey) await loadVaultPreferences(vaultKey);
    else await loadVaultPreferences(null);
    if (vaultKey && mode === SESSION_ACTIVE) await refresh();
  }, [refresh, refreshOfflineAvailability, applySecuritySnapshot, loadVaultPreferences]);
  useEffect(() => {
    (async () => {
      try {
        await hydrateSession();
      } finally {
        setReady(true);
      }
    })();
  }, [hydrateSession]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (
        appState.current.match(/active/) &&
        next.match(/inactive|background/) &&
        onboardingComplete &&
        activeVaultKey &&
        sessionMode === SESSION_ACTIVE
      ) {
        setUnlocked(false);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [onboardingComplete, activeVaultKey, sessionMode]);

  const lang = profile?.language || 'en';
  const translate = useCallback((key) => t(key, lang), [lang]);

  const lock = useCallback(() => {
    setUnlocked(false);
  }, []);

  const unlock = useCallback(() => {
    setUnlocked(true);
  }, []);

  const syncNow = useCallback(async () => {
    const epoch = sessionEpoch.current;
    const signedIn = await hasCloudSession();
    if (!signedIn) {
      setSyncPausedReason('cloud_auth_required');
      return { ok: false, reason: 'cloud_auth_required' };
    }
    if ((await getSessionMode()) === SESSION_ACCOUNT_SELECTION) {
      return { ok: false, reason: 'logged_out' };
    }
    const result = await runSync();
    if (!isCurrentEpoch(epoch)) return { ok: false, reason: 'stale_session' };
    if (result?.reason === 'cloud_auth_required' || result?.error?.includes?.('401')) {
      setSyncPausedReason('cloud_session_expired');
      setCloudSignedIn(false);
    } else if (result?.ok) {
      setSyncPausedReason(null);
    }
    await refresh();
    return result;
  }, [refresh, isCurrentEpoch]);

  const updateOnboardingStep = useCallback(async (step) => {
    await setOnboardingStep(step);
    setOnboardingStepState(step);
  }, []);

  const updateOnboardingPath = useCallback(async (path) => {
    await setOnboardingPath(path);
    setOnboardingPathState(path);
  }, []);

  const attachCloudSession = useCallback(async (authData) => {
    const { user, accessToken, refreshToken: rt } = authData;
    await setTokens({ accessToken, refreshToken: rt });
    await setCloudUser(user);
    setCloudUserState(user);
    setCloudSignedIn(true);
    setSyncPausedReason(null);
    return user;
  }, []);

  const openVaultForCloudUser = useCallback(
    async (user, { preferActiveOfflineMerge = false } = {}) => {
      const existing = await findVaultKeyForCloudUser(user.id);
      if (existing) {
        await setVaultOwner(existing, {
          type: 'cloud',
          id: user.id,
          email: user.email,
          sealed: false,
        });
        const security = await activateVault(existing, { refreshFinancial: true });
        return { ...security, reused: true, needsMergePrompt: false };
      }

      const currentKey = await getActiveVaultKey();
      const currentOwner = currentKey ? await getVaultOwner(currentKey) : null;
      const mode = await getSessionMode();
      if (
        preferActiveOfflineMerge &&
        mode === SESSION_ACTIVE &&
        currentKey &&
        currentOwner?.type === 'offline' &&
        !currentOwner.sealed
      ) {
        const security = await getSecuritySnapshot(currentKey);
        return {
          ...security,
          reused: false,
          needsMergePrompt: true,
        };
      }

      const key = cloudVaultKey(user.id);
      await setVaultOwner(key, {
        type: 'cloud',
        id: user.id,
        email: user.email,
        sealed: false,
      });
      const security = await activateVault(key, { refreshFinancial: true });
      return { ...security, reused: false, needsMergePrompt: false };
    },
    [activateVault]
  );

  const claimActiveVaultForCloudUser = useCallback(
    async (user) => {
      const key = (await getActiveVaultKey()) || 'legacy';
      await setVaultOwner(key, {
        type: 'cloud',
        id: user.id,
        email: user.email,
        sealed: false,
      });
      const security = await activateVault(key, { refreshFinancial: true });
      return security;
    },
    [activateVault]
  );

  /**
   * Resume existing offline vault or create the single offline vault.
   * Never allocates a new DB when an offline/legacy-offline vault already exists.
   */
  const openOfflineVault = useCallback(
    async ({ resumeOnly = false } = {}) => {
      const existing = await findResumableOfflineVaultKey();
      if (resumeOnly && !existing) {
        return { vaultKey: null, resumed: false, created: false };
      }
      const key = existing || 'offline';
      await setVaultOwner(key, { type: 'offline', id: 'offline', sealed: false });
      await setLastOfflineVaultKey(key);
      const security = await activateVault(key, { refreshFinancial: true });
      setHasOfflineProfile(true);
      return {
        ...security,
        resumed: Boolean(existing),
        created: !existing,
      };
    },
    [activateVault]
  );
  /**
   * Shared logout → account selection / Welcome.
   * Preserves vault DBs, PIN, keys, outbox. Clears active selection + cloud creds.
   */
  const performLogout = useCallback(
    async ({ forceWithoutSync = false, revokeCloud = true } = {}) => {
      const epoch = bumpEpoch();
      const vaultKey = await getActiveVaultKey();
      const user = await getCloudUser();
      const signedIn = await hasCloudSession();
      const owner = vaultKey ? await getVaultOwner(vaultKey) : null;

      let pending = 0;
      if (vaultKey && signedIn) {
        pending = await getOutboxCount().catch(() => 0);
        if (pending > 0 && !forceWithoutSync) {
          return { ok: false, reason: 'pending_changes', pending };
        }
      }

      let revoke = { revoked: false, reason: 'skipped' };
      if (revokeCloud && signedIn) {
        const accessToken = await getAccessToken();
        const refreshTok = await getRefreshToken();
        revoke = await logoutRequest({ accessToken, refreshToken: refreshTok });
      }

      if (vaultKey && user && (owner?.type === 'cloud' || signedIn)) {
        await setVaultOwner(vaultKey, {
          type: 'cloud',
          id: user.id,
          email: user.email,
          sealed: true,
        });
      } else if (vaultKey && (owner?.type === 'offline' || !user)) {
        await setVaultOwner(vaultKey, {
          type: 'offline',
          id: 'offline',
          sealed: false,
        });
        await setLastOfflineVaultKey(vaultKey);
      }

      // Always clear cloud credentials locally after explicit logout.
      await clearTokens();
      await clearCloudUser();
      await clearPendingCloudSession();
      await setActiveVaultKey(null);
      await setSessionMode(SESSION_ACCOUNT_SELECTION);
      await closeDbConnection();
      await consumeLegacyVaultMigration();

      if (!isCurrentEpoch(epoch)) {
        return { ok: false, reason: 'stale_session' };
      }

      setCloudUserState(null);
      setCloudSignedIn(false);
      setActiveVaultKeyState(null);
      setSessionModeState(SESSION_ACCOUNT_SELECTION);
      clearMemoryState();
      applySecuritySnapshot(null);
      await refreshOfflineAvailability();
      return {
        ok: true,
        remoteRevoked: revoke.revoked,
        remoteReason: revoke.reason || null,
        wasCloud: Boolean(signedIn || user),
      };
    },
    [bumpEpoch, isCurrentEpoch, clearMemoryState, refreshOfflineAvailability, applySecuritySnapshot]
  );

  const confirmLogoutFlow = useCallback(() => {
    return new Promise(async (resolve) => {
      const signedIn = await hasCloudSession();
      let pending = 0;
      if (signedIn && activeVaultKey) {
        pending = await getOutboxCount().catch(() => 0);
      }

      const baseMessage =
        'Log out and return to Welcome? Your saved data will remain on this device.';
      const message =
        pending > 0
          ? `${baseMessage}\n\nYou have ${pending} local change(s) that have not yet been synced to the cloud.`
          : baseMessage;

      if (pending <= 0) {
        Alert.alert('Log out', message, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve({ ok: false, reason: 'cancelled' }) },
          {
            text: 'Log out',
            style: 'destructive',
            onPress: async () => resolve(await performLogout({ forceWithoutSync: true })),
          },
        ]);
        return;
      }

      Alert.alert('Log out', message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve({ ok: false, reason: 'cancelled' }) },
        {
          text: 'Sync first',
          onPress: async () => {
            const syncResult = await syncNow();
            if (!syncResult?.ok) {
              Alert.alert(
                'Sync failed',
                'Could not sync pending changes. Log out anyway and keep them under this account, or cancel.',
                [
                  { text: 'Cancel', style: 'cancel', onPress: () => resolve({ ok: false, reason: 'cancelled' }) },
                  {
                    text: 'Log out anyway',
                    style: 'destructive',
                    onPress: async () => resolve(await performLogout({ forceWithoutSync: true })),
                  },
                ]
              );
              return;
            }
            resolve(await performLogout({ forceWithoutSync: true }));
          },
        },
        {
          text: 'Log out anyway',
          style: 'destructive',
          onPress: async () => resolve(await performLogout({ forceWithoutSync: true })),
        },
      ]);
    });
  }, [activeVaultKey, performLogout, syncNow]);

  /** PIN-screen "Back to Welcome" — same persisted account-selection state. */
  const exitToWelcomeFromLock = useCallback(async () => {
    return performLogout({ forceWithoutSync: true, revokeCloud: true });
  }, [performLogout]);

  const markSecurityComplete = useCallback(async () => {
    const key = (await getActiveVaultKey()) || activeVaultKey;
    if (!key) {
      throw new Error('No active vault for security completion');
    }
    await completeOnboarding(key);
    await consumeLegacyVaultMigration();
    await setSessionMode(SESSION_ACTIVE);
    await clearOnboardingProgress();
    const security = await getSecuritySnapshot(key);
    applySecuritySnapshot(security);
    setOnboardingStepState('done');
    setOnboardingPathState(null);
    setSessionModeState(SESSION_ACTIVE);
    return security;
  }, [activeVaultKey, applySecuritySnapshot]);
  const value = useMemo(
    () => ({
      ready,
      onboardingComplete,
      setOnboardingComplete,
      unlocked,
      unlock,
      lock,
      profile,
      setProfile,
      refresh,
      refreshToken,
      online,
      syncMeta,
      outboxCount,
      syncNow,
      biometricsEnabled,
      setBiometricsEnabled,
      t: translate,
      lang,
      cloudUser,
      cloudSignedIn,
      activeVaultKey,
      onboardingPath,
      onboardingStep,
      hasPin,
      syncPausedReason,
      setSyncPausedReason,
      sessionMode,
      hasOfflineProfile,
      updateOnboardingStep,
      updateOnboardingPath,
      attachCloudSession,
      openVaultForCloudUser,
      claimActiveVaultForCloudUser,
      openOfflineVault,
      activateVault,
      applySecuritySnapshot,
      performLogout,
      confirmLogoutFlow,
      exitToWelcomeFromLock,
      /** @deprecated use confirmLogoutFlow */
      confirmSignOutFlow: confirmLogoutFlow,
      signOutCloud: performLogout,
      markSecurityComplete,
      hydrateSession,
      setHasPin,
      setCloudUserState,
      setCloudSignedIn,
      sessionEpoch,
      isCurrentEpoch,
      refreshOfflineAvailability,
      displayCurrency,
      ledgerCurrency,
      fxSnapshot,
      setDisplayCurrency,
      vaultAppearanceMode,
      setVaultAppearancePreference,
      refreshFxRates: () => refreshRates({ ledgerCurrency: LEDGER_CURRENCY }).then(setFxSnapshot),
    }),
    [
      ready,
      onboardingComplete,
      unlocked,
      unlock,
      lock,
      profile,
      refresh,
      refreshToken,
      online,
      syncMeta,
      outboxCount,
      syncNow,
      biometricsEnabled,
      translate,
      lang,
      cloudUser,
      cloudSignedIn,
      activeVaultKey,
      onboardingPath,
      onboardingStep,
      hasPin,
      syncPausedReason,
      sessionMode,
      hasOfflineProfile,
      updateOnboardingStep,
      updateOnboardingPath,
      attachCloudSession,
      openVaultForCloudUser,
      claimActiveVaultForCloudUser,
      openOfflineVault,
      activateVault,
      applySecuritySnapshot,
      performLogout,
      confirmLogoutFlow,
      exitToWelcomeFromLock,
      markSecurityComplete,
      hydrateSession,
      isCurrentEpoch,
      refreshOfflineAvailability,
      displayCurrency,
      ledgerCurrency,
      fxSnapshot,
      setDisplayCurrency,
      vaultAppearanceMode,
      setVaultAppearancePreference,
    ]
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}
