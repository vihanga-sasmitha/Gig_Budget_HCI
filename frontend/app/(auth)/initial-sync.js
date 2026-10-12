import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import { useApp } from '../../src/context/AppContext';
import { colors, spacing, typography } from '../../src/theme';

export default function InitialSync() {
  const router = useRouter();
  const {
    t,
    syncNow,
    markSecurityComplete,
    unlock,
    updateOnboardingStep,
    isCurrentEpoch,
    sessionEpoch,
    unlocked,
    hasPin,
    activeVaultKey,
  } = useApp();
  const [status, setStatus] = useState(t('onboarding.syncStarting'));
  const [error, setError] = useState('');
  const [doneOk, setDoneOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  /**
   * After first-time PIN+bio for THIS vault, unlock once and open Dashboard.
   * Do not send users to Enter PIN again unless the vault is locked without a
   * just-completed setup (unlocked stays false and hasPin was pre-existing).
   */
  const finishOk = useCallback(async () => {
    await markSecurityComplete();
    if (!unlocked && hasPin) {
      // Setup flow reaches here unlocked=false after bio; unlock for this session.
      unlock();
    }
    router.replace('/(tabs)');
  }, [markSecurityComplete, unlock, unlocked, hasPin, router]);

  const continueWithoutSyncSuccess = useCallback(async () => {
    setBusy(true);
    try {
      await markSecurityComplete();
      unlock();
      router.replace('/(tabs)');
    } finally {
      setBusy(false);
    }
  }, [markSecurityComplete, unlock, router]);

  const run = useCallback(async () => {
    if (!activeVaultKey) {
      router.replace('/welcome');
      return;
    }
    const epoch = sessionEpoch.current;
    setBusy(true);
    setError('');
    setDoneOk(false);
    setStatus(t('onboarding.syncPushPull'));
    await updateOnboardingStep('initial_sync');
    try {
      const result = await syncNow();
      if (!isCurrentEpoch(epoch)) return;
      if (result?.ok) {
        setStatus(t('onboarding.syncSuccess'));
        setDoneOk(true);
        await finishOk();
        return;
      }
      const reason = result?.reason || result?.error || 'sync_failed';
      setDoneOk(false);
      setError(
        reason === 'offline'
          ? t('onboarding.syncOfflineFail')
          : reason === 'cloud_auth_required' || reason === 'logged_out'
            ? t('onboarding.syncAuthFail')
            : `${t('onboarding.syncFailed')}: ${reason}`
      );
      setStatus(t('onboarding.syncFailed'));
    } catch (e) {
      if (!isCurrentEpoch(epoch)) return;
      setDoneOk(false);
      setError(e.message || t('onboarding.syncFailed'));
      setStatus(t('onboarding.syncFailed'));
    } finally {
      setBusy(false);
    }
  }, [
    syncNow,
    t,
    updateOnboardingStep,
    finishOk,
    isCurrentEpoch,
    sessionEpoch,
    activeVaultKey,
    router,
  ]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, [run]);

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={typography.title}>{t('onboarding.initialSyncTitle')}</Text>
        <Text style={styles.body}>{status}</Text>
        {busy ? <ActivityIndicator size="large" color={colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {error ? (
          <>
            <Button title={t('common.retry')} onPress={run} loading={busy} disabled={busy} />
            <Button
              title={t('onboarding.continueOfflineAfterSync')}
              variant="secondary"
              onPress={continueWithoutSyncSuccess}
              disabled={busy}
            />
            <Text style={styles.note}>{t('onboarding.syncFailExplain')}</Text>
          </>
        ) : null}
        {doneOk && !busy ? <Text style={styles.ok}>{t('onboarding.syncSuccess')}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  error: { color: colors.danger, lineHeight: 20 },
  ok: { color: colors.primaryDark, fontWeight: '700' },
  note: { color: colors.textSecondary, lineHeight: 20 },
});
