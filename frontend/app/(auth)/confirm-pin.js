import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../src/components/Screen';
import PinDots from '../../src/components/PinDots';
import Keypad from '../../src/components/Keypad';
import StepBadge from '../../src/components/StepBadge';
import HeroIcon from '../../src/components/HeroIcon';
import Card from '../../src/components/Card';
import { usePinEntry } from '../../src/hooks/usePinEntry';
import { setupPin } from '../../src/security/pinVault';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/theme';

export default function ConfirmPin() {
  const { pin: expected } = useLocalSearchParams();
  const router = useRouter();
  const { t, updateOnboardingStep, setHasPin, activeVaultKey, applySecuritySnapshot } = useApp();
  const { colors, spacing, typography } = useTheme();
  const { pin, onKey, clear } = usePinEntry(4);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const remaining = Math.max(4 - pin.length, 0);

  useEffect(() => {
    if (pin.length < 4 || saving) return;
    if (pin !== expected) {
      setError(t('onboarding.pinMismatch'));
      clear();
      return;
    }
    (async () => {
      setSaving(true);
      try {
        if (!activeVaultKey) {
          setError('No active profile for PIN setup. Sign in again.');
          clear();
          setSaving(false);
          return;
        }
        await setupPin(activeVaultKey, pin);
        setHasPin(true);
        applySecuritySnapshot({
          vaultKey: activeVaultKey,
          hasPin: true,
          securityComplete: false,
          biometricsEnabled: false,
          nextStep: 'biometrics',
        });
        await updateOnboardingStep('biometrics');
        router.replace('/biometrics');
      } catch (e) {
        setError(e.message || t('common.error'));
        clear();
        setSaving(false);
      }
    })();
  }, [
    pin,
    expected,
    router,
    clear,
    t,
    updateOnboardingStep,
    setHasPin,
    saving,
    activeVaultKey,
    applySecuritySnapshot,
  ]);

  return (
    <Screen scroll>
      <StepBadge step={2} total={3} />
      <HeroIcon name="lock-closed" badgeName="checkmark" />
      <Text style={[typography.title, { textAlign: 'center' }]}>{t('onboarding.confirmPin')}</Text>
      <Text
        style={{
          ...typography.body,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: spacing.md,
        }}
      >
        Please enter the same 4-digit PIN again.
      </Text>
      {error ? (
        <Text style={{ color: colors.danger, textAlign: 'center', marginBottom: spacing.sm }}>
          {error}
        </Text>
      ) : (
        <Text style={{ color: colors.primaryDark, textAlign: 'center', fontWeight: '600' }}>
          {remaining} digit{remaining === 1 ? '' : 's'} remaining
        </Text>
      )}
      <Card style={{ gap: spacing.lg, marginTop: spacing.md, paddingVertical: spacing.lg }}>
        <PinDots filled={pin.length} />
        <Keypad onKey={onKey} showDecimal={false} />
      </Card>
      <View
        style={{
          marginTop: spacing.lg,
          flexDirection: 'row',
          gap: spacing.sm,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="shield-checkmark" size={16} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          PIN is encrypted and stored on your device only.
        </Text>
      </View>
    </Screen>
  );
}
