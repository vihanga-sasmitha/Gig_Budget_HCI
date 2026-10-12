import { useEffect, useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import Card from '../../src/components/Card';
import StepBadge from '../../src/components/StepBadge';
import HeroIcon from '../../src/components/HeroIcon';
import { setBiometricsEnabled } from '../../src/security/pinVault';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/theme';

export default function Biometrics() {
  const router = useRouter();
  const {
    t,
    unlock,
    setBiometricsEnabled: setBioState,
    onboardingPath,
    cloudSignedIn,
    markSecurityComplete,
    updateOnboardingStep,
    activeVaultKey,
  } = useApp();
  const { colors, spacing, typography, radii } = useTheme();
  const [supported, setSupported] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setSupported(Boolean(hw && enrolled));
    })();
    updateOnboardingStep('biometrics');
  }, [updateOnboardingStep]);

  const goNext = async () => {
    if (onboardingPath === 'cloud' || cloudSignedIn) {
      await updateOnboardingStep('initial_sync');
      router.replace('/initial-sync');
      return;
    }
    await markSecurityComplete();
    unlock();
    router.replace('/(tabs)');
  };

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!activeVaultKey) {
        router.replace('/welcome');
        return;
      }
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (hw && enrolled) {
        const res = await LocalAuthentication.authenticateAsync({
          promptMessage: t('onboarding.enableBiometrics'),
          fallbackLabel: t('onboarding.loginTitle'),
          cancelLabel: t('common.cancel'),
        });
        if (res.success) {
          await setBiometricsEnabled(activeVaultKey, true);
          setBioState(true);
        }
      }
      await goNext();
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await goNext();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <StepBadge step={3} total={3} />
      <HeroIcon name="finger-print" />
      <Text style={[typography.title, { textAlign: 'center' }]}>Enable biometrics?</Text>
      <Text
        style={{
          ...typography.body,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: spacing.lg,
        }}
      >
        Use your fingerprint or face unlock for faster access on this device.
      </Text>

      <Card style={{ alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="finger-print" size={36} color={colors.primary} />
          </View>
        </View>
        <Text style={{ fontWeight: '800', letterSpacing: 1, color: colors.text }}>TOUCH SENSOR</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {supported === false
            ? t('onboarding.biometricsUnavailable')
            : 'You can also enable this later in Settings'}
        </Text>
      </Card>

      {supported ? (
        <Button title="Use biometrics" onPress={enable} loading={busy} disabled={busy} />
      ) : null}
      <Pressable onPress={skip} disabled={busy} style={{ alignItems: 'center', padding: spacing.md }}>
        <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>Skip for now</Text>
      </Pressable>
    </Screen>
  );
}
