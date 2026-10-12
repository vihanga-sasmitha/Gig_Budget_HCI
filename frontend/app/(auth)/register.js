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
import Card from '../../src/components/Card';
import { registerRequest } from '../../src/api/authApi';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/theme';

const OCCUPATIONS = [
  { value: 'delivery_rider', label: 'Delivery rider' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'online_seller', label: 'Online seller' },
  { value: 'ride_hailing_driver', label: 'Ride-hailing driver' },
  { value: 'student_gig_worker', label: 'Student gig worker' },
  { value: 'other', label: 'Other' },
];

export default function Register() {
  const router = useRouter();
  const {
    t,
    attachCloudSession,
    openVaultForCloudUser,
    updateOnboardingStep,
  } = useApp();
  const { colors, spacing, typography, radii } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [occupation, setOccupation] = useState('other');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

  const submit = async () => {
    if (submitting.current || busy) return;
    setError('');
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError(t('onboarding.authRequired'));
      return;
    }
    if (password.length < 8) {
      setError(t('onboarding.weakPassword'));
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const data = await registerRequest({ email, password, name, occupation });
      await attachCloudSession(data);
      const { resolvePostVaultAuthRoute } = await import('../../src/security/pinVault');
      const security = await openVaultForCloudUser(data.user, {
        preferActiveOfflineMerge: false,
      });
      const href = resolvePostVaultAuthRoute(security, { cloudSession: true });
      if (href === '/create-pin') await updateOnboardingStep('create_pin');
      else if (href === '/biometrics') await updateOnboardingStep('biometrics');
      router.replace(href);
    } catch (e) {
      setError(e.message || t('common.error'));
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={typography.title}>{t('onboarding.createAccount')}</Text>
        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            marginVertical: spacing.md,
          }}
        >
          {t('onboarding.registerHelp')}
        </Text>

        <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }}>
          Full name
        </Text>
        <TextInput
          style={inputStyle}
          value={name}
          onChangeText={setName}
          editable={!busy}
          placeholder="Your name"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }}>
          {t('onboarding.email')}
        </Text>
        <TextInput
          style={inputStyle}
          autoCapitalize="none"
          keyboardType="email-address"
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
          style={inputStyle}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          editable={!busy}
          placeholder="At least 8 characters"
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

        <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }}>
          Confirm password
        </Text>
        <TextInput
          style={inputStyle}
          secureTextEntry={!showConfirm}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!busy}
          placeholder="Re-enter password"
          placeholderTextColor={colors.textSecondary}
        />
        <Pressable
          onPress={() => setShowConfirm((v) => !v)}
          style={{ alignSelf: 'flex-end', marginBottom: spacing.md }}
        >
          <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>
            {showConfirm ? t('onboarding.hidePassword') : t('onboarding.showPassword')}
          </Text>
        </Pressable>

        <Card style={{ marginBottom: spacing.md, backgroundColor: colors.primarySoft }}>
          <Text style={{ color: colors.primaryDark, fontSize: 13, lineHeight: 18 }}>
            Password must be at least 8 characters. After creating your account you will set a
            device PIN for this vault.
          </Text>
        </Card>

        <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }}>
          {t('onboarding.occupation')}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          {OCCUPATIONS.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => setOccupation(o.value)}
              style={{
                borderWidth: 1,
                borderColor: occupation === o.value ? colors.primary : colors.border,
                borderRadius: radii.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                backgroundColor: occupation === o.value ? colors.primary : colors.surface,
              }}
            >
              <Text
                style={{
                  color: occupation === o.value ? colors.textOnPrimary : colors.text,
                  fontWeight: occupation === o.value ? '700' : '400',
                }}
              >
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? (
          <Text style={{ color: colors.danger, marginBottom: spacing.md, lineHeight: 20 }}>
            {error}
          </Text>
        ) : null}

        <Button
          title={t('onboarding.createAccount')}
          onPress={submit}
          loading={busy}
          disabled={busy}
        />
        <Pressable onPress={() => router.replace('/sign-in')} disabled={busy}>
          <Text
            style={{
              color: colors.primaryDark,
              textAlign: 'center',
              marginTop: spacing.lg,
              fontWeight: '600',
            }}
          >
            {t('onboarding.haveAccount')}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </Screen>
  );
}
