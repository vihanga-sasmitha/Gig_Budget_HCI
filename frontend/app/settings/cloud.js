import { useRef, useState } from 'react';
import { Text, TextInput, StyleSheet, Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import { loginRequest, registerRequest, apiBase } from '../../src/api/authApi';
import { clearTokens } from '../../src/api/authStorage';
import { clearCloudUser } from '../../src/api/sessionStorage';
import { resolvePostVaultAuthRoute } from '../../src/security/pinVault';
import { useApp } from '../../src/context/AppContext';
import { updateProfile } from '../../src/db/database';
import { colors, spacing, typography } from '../../src/theme';
export default function CloudAccount() {
  const router = useRouter();
  const {
    t,
    syncNow,
    cloudSignedIn,
    cloudUser,
    confirmLogoutFlow,
    attachCloudSession,
    openVaultForCloudUser,
    claimActiveVaultForCloudUser,
    refresh,
    outboxCount,
    syncPausedReason,
    unlocked,
    isCurrentEpoch,
    sessionEpoch,
    setCloudUserState,
    setCloudSignedIn,
  } = useApp();

  const [mode, setMode] = useState('signin'); // signin | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  const formatAuthError = (e) => {
    if (e?.network || e?.code === 'NETWORK') return e.message;
    if (e?.code === 'VALIDATION') return e.message;
    if (e?.status === 401) return t('onboarding.invalidCredentials');
    if (e?.status >= 500) return e.message || t('onboarding.serverError');
    return e?.message || t('common.error');
  };

  const afterAuth = async (data) => {
    const epoch = sessionEpoch.current;
    await attachCloudSession(data);
    if (!isCurrentEpoch(epoch)) return;

    // Linking an offline vault requires an unlocked session + explicit consent.
    const allowMergePrompt = unlocked;
    let security = await openVaultForCloudUser(data.user, {
      preferActiveOfflineMerge: allowMergePrompt,
    });
    if (!isCurrentEpoch(epoch)) return;

    if (security.needsMergePrompt) {
      const choice = await new Promise((resolve) => {
        Alert.alert(t('settings.linkTitle'), t('settings.linkBody'), [
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve('cancel') },
          { text: t('settings.linkUpload'), onPress: () => resolve('merge') },
          { text: t('settings.linkFresh'), style: 'destructive', onPress: () => resolve('fresh') },
        ]);
      });
      if (!isCurrentEpoch(epoch)) return;
      if (choice === 'cancel') {
        await clearTokens();
        await clearCloudUser();
        setCloudUserState(null);
        setCloudSignedIn(false);
        setStatus(t('settings.linkCancelled'));
        return;
      }
      if (choice === 'merge') {
        security = await claimActiveVaultForCloudUser(data.user);
        if (data.user.name) await updateProfile({ name: data.user.name });
      } else {
        security = await openVaultForCloudUser(data.user, { preferActiveOfflineMerge: false });
      }
    }

    if (!isCurrentEpoch(epoch)) return;

    // New cloud vault without its own PIN → Create PIN (do not use offline PIN).
    if (!security.securityComplete) {
      const href = resolvePostVaultAuthRoute(security, { cloudSession: true });
      setStatus(t('settings.cloudLinked'));
      router.replace(href);
      return;
    }

    await refresh();
    setStatus(t('settings.cloudLinked'));
    const syncResult = await syncNow();
    if (!isCurrentEpoch(epoch)) return;
    if (!syncResult?.ok) {
      setStatus(
        `${t('settings.cloudLinked')} — ${t('onboarding.syncFailed')}: ${
          syncResult?.reason || syncResult?.error || ''
        }`
      );
    } else {
      setStatus(t('settings.cloudSynced'));
    }
  };
  const register = async () => {
    if (submitting.current || busy) return;
    submitting.current = true;
    setBusy(true);
    setStatus('');
    try {
      const data = await registerRequest({
        email,
        password,
        name,
        occupation: 'other',
      });
      await afterAuth(data);
    } catch (e) {
      setStatus(formatAuthError(e));
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  };

  const login = async () => {
    if (submitting.current || busy) return;
    submitting.current = true;
    setBusy(true);
    setStatus('');
    try {
      // Sign-in uses email + password only (display name is for registration).
      const data = await loginRequest({ email, password });
      await afterAuth(data);
    } catch (e) {
      setStatus(formatAuthError(e));
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  };

  const logout = async () => {
    setBusy(true);
    try {
      const result = await confirmLogoutFlow();
      if (!result?.ok) {
        if (result?.reason !== 'cancelled') setStatus(result?.reason || t('common.error'));
        return;
      }
      const note = result.remoteRevoked
        ? t('settings.signedOut')
        : t('settings.signedOutLocalOnly');
      Alert.alert(t('settings.logOut'), note);
      router.replace('/welcome');
    } finally {
      setBusy(false);
    }
  };

  if (cloudSignedIn && cloudUser) {
    return (
      <Screen scroll>
        <Text style={typography.subtitle}>{t('settings.connectedAccount')}</Text>
        <Text style={styles.accountName}>{cloudUser.name}</Text>
        <Text style={styles.accountEmail}>{cloudUser.email}</Text>
        {outboxCount > 0 ? (
          <Text style={styles.pending}>
            {t('settings.pending')}: {outboxCount}
          </Text>
        ) : null}
        {syncPausedReason ? <Text style={styles.warn}>{t('settings.syncPaused')}</Text> : null}
        <Button title={t('settings.syncNow')} variant="secondary" onPress={() => syncNow()} loading={busy} />
        <Button title={t('settings.logOut')} variant="danger" onPress={logout} loading={busy} />
        <Text style={styles.help}>{t('settings.signOutHelp')}</Text>
        <Text style={styles.help}>API: {apiBase()}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.help}>{t('settings.cloudConnectHelp')}</Text>
      {syncPausedReason ? <Text style={styles.warn}>{t('settings.syncPaused')}</Text> : null}

      <View style={styles.modeRow}>
        <Pressable
          onPress={() => setMode('signin')}
          style={[styles.modeChip, mode === 'signin' && styles.modeChipActive]}
        >
          <Text style={[styles.modeText, mode === 'signin' && styles.modeTextActive]}>
            {t('onboarding.signIn')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('register')}
          style={[styles.modeChip, mode === 'register' && styles.modeChipActive]}
        >
          <Text style={[styles.modeText, mode === 'register' && styles.modeTextActive]}>
            {t('onboarding.createAccount')}
          </Text>
        </Pressable>
      </View>

      {mode === 'register' ? (
        <TextInput
          style={styles.input}
          placeholder={t('onboarding.displayName')}
          value={name}
          onChangeText={setName}
          editable={!busy}
          autoCorrect={false}
        />
      ) : null}

      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        placeholder={t('onboarding.email')}
        value={email}
        onChangeText={setEmail}
        editable={!busy}
      />
      <View>
        <TextInput
          style={styles.input}
          secureTextEntry={!showPassword}
          textContentType="password"
          autoComplete="password"
          autoCorrect={false}
          placeholder={t('onboarding.password')}
          value={password}
          onChangeText={setPassword}
          editable={!busy}
        />
        <Pressable onPress={() => setShowPassword((v) => !v)}>
          <Text style={styles.show}>
            {showPassword ? t('onboarding.hidePassword') : t('onboarding.showPassword')}
          </Text>
        </Pressable>
      </View>

      {mode === 'signin' ? (
        <Button title={t('onboarding.signIn')} onPress={login} loading={busy} disabled={busy} />
      ) : (
        <Button
          title={t('onboarding.createAccount')}
          onPress={register}
          loading={busy}
          disabled={busy}
        />
      )}

      {status ? <Text style={styles.status}>{status}</Text> : null}
      <Text style={styles.help}>API: {apiBase()}</Text>
      <Text style={styles.help}>{t('settings.cloudSignInNote')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: { color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  status: { marginTop: spacing.md, color: colors.primaryDark, fontWeight: '600', lineHeight: 20 },
  accountName: { ...typography.title, marginTop: spacing.sm },
  accountEmail: { color: colors.primaryDark, fontWeight: '600', marginBottom: spacing.md },
  pending: { color: colors.primaryDark, fontWeight: '600', marginBottom: spacing.sm },
  warn: { color: colors.warning, marginBottom: spacing.md, lineHeight: 20 },
  show: {
    color: colors.primaryDark,
    fontWeight: '600',
    marginBottom: spacing.md,
    alignSelf: 'flex-end',
  },
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  modeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  modeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeText: { color: colors.text, fontWeight: '600' },
  modeTextActive: { color: '#fff' },
});
