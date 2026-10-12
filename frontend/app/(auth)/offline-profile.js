import { useEffect, useState } from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import { updateProfile } from '../../src/db/database';
import { resolvePostVaultAuthRoute } from '../../src/security/pinVault';
import { useApp } from '../../src/context/AppContext';
import { colors, spacing, typography } from '../../src/theme';

export default function OfflineProfile() {
  const router = useRouter();
  const {
    t,
    openOfflineVault,
    updateOnboardingStep,
    hasOfflineProfile,
    refresh,
  } = useApp();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    if (!hasOfflineProfile) return;
    let cancelled = false;
    (async () => {
      setResuming(true);
      try {
        const security = await openOfflineVault({ resumeOnly: true });
        if (cancelled) return;
        if (!security.vaultKey) return;
        const href = resolvePostVaultAuthRoute(security, { cloudSession: false });
        if (href === '/create-pin') await updateOnboardingStep('create_pin');
        router.replace(href);
      } catch (e) {
        if (!cancelled) setError(e.message || t('common.error'));
      } finally {
        if (!cancelled) setResuming(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasOfflineProfile, openOfflineVault, router, t, updateOnboardingStep]);

  const continueFlow = async () => {
    setBusy(true);
    setError('');
    try {
      const security = await openOfflineVault({ resumeOnly: false });
      const href = resolvePostVaultAuthRoute(security, { cloudSession: false });
      if (href === '/login') {
        router.replace('/login');
        return;
      }
      if (href === '/create-pin') {
        await updateProfile({ name: name.trim() || t('settings.defaultName') });
        await refresh();
        await updateOnboardingStep('create_pin');
        router.replace('/create-pin');
        return;
      }
      await updateOnboardingStep('biometrics');
      router.replace(href);
    } catch (e) {
      setError(e.message || t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  if (resuming || hasOfflineProfile) {
    return (
      <Screen>
        <Text style={typography.title}>{t('onboarding.resumeOfflineTitle')}</Text>
        <Text style={styles.help}>{t('onboarding.resumeOfflineBody')}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={typography.title}>{t('onboarding.offlineProfileTitle')}</Text>
      <Text style={styles.help}>{t('onboarding.offlineProfileBody')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('settings.name')}
        value={name}
        onChangeText={setName}
        editable={!busy}
        autoCorrect={false}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={t('common.continue')} onPress={continueFlow} loading={busy} disabled={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: { ...typography.body, color: colors.textSecondary, marginVertical: spacing.md, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  error: { color: colors.danger, marginBottom: spacing.md },
});
