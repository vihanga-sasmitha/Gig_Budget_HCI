import { useRef, useState } from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import { forgotPasswordRequest } from '../../src/api/authApi';
import { useApp } from '../../src/context/AppContext';
import { colors, spacing, typography } from '../../src/theme';

export default function ForgotPassword() {
  const router = useRouter();
  const { t } = useApp();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  const submit = async () => {
    if (submitting.current || busy) return;
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError(t('onboarding.authRequired'));
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const data = await forgotPasswordRequest(email);
      setMessage(data?.message || t('onboarding.forgotSent'));
    } catch (e) {
      setError(e.message || t('common.error'));
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  };

  return (
    <Screen scroll>
      <Text style={typography.title}>{t('onboarding.forgotPassword')}</Text>
      <Text style={styles.help}>{t('onboarding.forgotHelp')}</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!busy}
        placeholder="you@example.com"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      <Button title={t('onboarding.sendReset')} onPress={submit} loading={busy} disabled={busy} />
      <Button title={t('common.back')} variant="secondary" onPress={() => router.back()} />
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
  ok: { color: colors.success || colors.primaryDark, marginBottom: spacing.md, lineHeight: 20 },
});
