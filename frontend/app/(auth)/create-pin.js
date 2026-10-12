import { useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../src/components/Screen';
import PinDots from '../../src/components/PinDots';
import Keypad from '../../src/components/Keypad';
import StepBadge from '../../src/components/StepBadge';
import HeroIcon from '../../src/components/HeroIcon';
import Card from '../../src/components/Card';
import { usePinEntry } from '../../src/hooks/usePinEntry';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/theme';

export default function CreatePin() {
  const router = useRouter();
  const { t, updateOnboardingStep, onboardingComplete, hasPin, activeVaultKey } = useApp();
  const { colors, spacing, typography } = useTheme();
  const { pin, onKey } = usePinEntry(4);

  useEffect(() => {
    if (!activeVaultKey) {
      router.replace('/welcome');
      return;
    }
    if (onboardingComplete && hasPin) {
      router.replace('/login');
    }
  }, [onboardingComplete, hasPin, activeVaultKey, router]);

  useEffect(() => {
    updateOnboardingStep('create_pin');
  }, [updateOnboardingStep]);

  useEffect(() => {
    if (pin.length === 4) {
      updateOnboardingStep('confirm_pin');
      router.push({ pathname: '/confirm-pin', params: { pin } });
    }
  }, [pin, router, updateOnboardingStep]);

  return (
    <Screen scroll>
      <StepBadge step={1} total={3} />
      <HeroIcon name="lock-closed" />
      <Text style={[typography.title, { textAlign: 'center' }]}>{t('onboarding.createPin')}</Text>
      <Text
        style={{
          ...typography.body,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: spacing.lg,
        }}
      >
        This PIN protects your financial data on this device only.
      </Text>
      <Card style={{ gap: spacing.lg, paddingVertical: spacing.lg }}>
        <PinDots filled={pin.length} />
        <Keypad onKey={onKey} showDecimal={false} />
      </Card>
      <View
        style={{
          marginTop: spacing.lg,
          backgroundColor: colors.primarySoft,
          borderRadius: 12,
          padding: spacing.md,
          flexDirection: 'row',
          gap: spacing.sm,
          alignItems: 'center',
        }}
      >
        <Ionicons name="shield-checkmark" size={18} color={colors.primaryDark} />
        <Text style={{ flex: 1, color: colors.primaryDark, fontWeight: '600', fontSize: 13 }}>
          PIN is encrypted and stored on your device only.
        </Text>
      </View>
    </Screen>
  );
}
