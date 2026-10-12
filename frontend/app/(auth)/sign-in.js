import { useRef, useState } from 'react';
import {
  Text,
  TextInput,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import HeroIcon from '../../src/components/HeroIcon';
import { loginRequest, apiBase } from '../../src/api/authApi';
import { resolvePostVaultAuthRoute } from '../../src/security/pinVault';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/theme';

export default function SignIn() {
  const router = useRouter();
  const {
    t,
    attachCloudSession,
    openVaultForCloudUser,
    updateOnboardingStep,
    isCurrentEpoch,
    sessionEpoch,
  } = useApp();
  const { colors, spacing, typography, radii } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.inputBg,
    marginBottom: spacing.md,
    color: colors.text,
  };

  const formatAuthError = (e) => {
    if (e?.network || e?.code === 'NETWORK') return e.message;
    if (e?.code === 'VALIDATION') return e.message;
    if (e?.status === 401) return t('onboarding.invalidCredentials');
    if (e?.status >= 500) return e.message || t('onboarding.serverError');
    return e?.message || t('common.error');
  };

  const submit = async () => {
    if (submitting.current || busy) return;
    setError('');
    if (!email.trim() || !password) {
      setError(t('onboarding.authRequired'));
      return;
    }
    submitting.current = true;
    setBusy(true);
    const epoch = sessionEpoch.current;
    try {
      const data = await loginRequest({ email, password });
      if (!isCurrentEpoch(epoch)) return;
      await attachCloudSession(data);
      if (!isCurrentEpoch(epoch)) return;

      const security = await openVaultForCloudUser(data.user, {
        preferActiveOfflineMerge: false,
      });
      if (!isCurrentEpoch(epoch)) return;

      const href = resolvePostVaultAuthRoute(security, { cloudSession: true });
      if (href === '/create-pin') {
        await updateOnboardingStep('create_pin');
      } else if (href === '/biometrics') {
        await updateOnboardingStep('biometrics');
      } else if (href === '/login') {
        await updateOnboardingStep('done');
      }
      router.replace(href);
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <HeroIcon name="log-in-outline" />
        <Text style={[typography.title, { textAlign: 'center' }]}>{t('onboarding.signIn')}</Text>
        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            marginVertical: spacing.md,
            textAlign: 'center',
          }}
        >
          {t('onboarding.signInHelp')}
        </Text>

        <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }}>
          {t('onboarding.email')}
        </Text>
        <TextInput
          style={inputStyle}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
          placeholder="you@example.com"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }}>
          {t('onboarding.password')}
        </Text>
        <TextInput
          style={{ ...inputStyle, marginBottom: spacing.xs }}
          secureTextEntry={!showPassword}
          textContentType="password"
          autoComplete="password"
          autoCorrect={false}
          value={password}
          onChangeText={setPassword}
          editable={!busy}
          placeholder="••••••••"
          placeholderTextColor={colors.textSecondary}
        />
        <Pressable
          onPress={() => setShowPassword((v) => !v)}
          style={{ alignSelf: 'flex-end', marginBottom: spacing.md }}
        >
          <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>
            {showPassword ? t('onboarding.hidePassword') : t('onboarding.showPassword')}
          </Text>
        </Pressable>

        {error ? (
          <Text style={{ color: colors.danger, marginBottom: spacing.md, lineHeight: 20 }}>
            {error}
          </Text>
        ) : null}

        <Button title={t('onboarding.signIn')} onPress={submit} loading={busy} disabled={busy} />
        <View style={{ height: spacing.sm }} />
        <Button
          title={t('onboarding.forgotPassword')}
          variant="secondary"
          onPress={() => router.push('/forgot-password')}
          disabled={busy}
        />
        <Pressable onPress={() => router.replace('/register')} disabled={busy}>
          <Text
            style={{
              color: colors.primaryDark,
              textAlign: 'center',
              marginTop: spacing.lg,
              fontWeight: '600',
            }}
          >
            {t('onboarding.needAccount')}
          </Text>
        </Pressable>
        <Text style={{ color: colors.textSecondary, marginTop: spacing.md, fontSize: 12 }}>
          API: {apiBase()}
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}
