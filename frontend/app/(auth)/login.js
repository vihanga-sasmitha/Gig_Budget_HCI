import { useEffect, useState } from 'react';
import { Text, View, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import Screen from '../../src/components/Screen';
import PinDots from '../../src/components/PinDots';
import Keypad from '../../src/components/Keypad';
import Button from '../../src/components/Button';
import HeroIcon from '../../src/components/HeroIcon';
import { usePinEntry } from '../../src/hooks/usePinEntry';
import { verifyPin, getLockoutState, isBiometricsEnabled } from '../../src/security/pinVault';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/theme';

export default function Login() {
  const router = useRouter();
  const {
    t,
    unlock,
    onboardingComplete,
    activeVaultKey,
    sessionMode,
    exitToWelcomeFromLock,
    cloudSignedIn,
    syncNow,
  } = useApp();
  const { colors, spacing, typography } = useTheme();
  const { pin, onKey, clear } = usePinEntry(4);
  const [lockMsg, setLockMsg] = useState('');
  const [bio, setBio] = useState(false);
  const [busyExit, setBusyExit] = useState(false);

  useEffect(() => {
    if (!activeVaultKey || sessionMode === 'account_selection') {
      router.replace('/welcome');
      return;
    }
    if (!onboardingComplete) {
      router.replace('/create-pin');
    }
  }, [onboardingComplete, activeVaultKey, sessionMode, router]);

  useEffect(() => {
    if (!activeVaultKey) return;
    (async () => {
      const lock = await getLockoutState(activeVaultKey);
      if (lock.locked) updateLockMsg(lock.retryAt);
      const enabled = await isBiometricsEnabled(activeVaultKey);
      if (!enabled) {
        setBio(false);
        return;
      }
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBio(Boolean(hw && enrolled));
    })();
  }, [activeVaultKey]);

  const updateLockMsg = (retryAt) => {
    const sec = Math.ceil((retryAt - Date.now()) / 1000);
    setLockMsg(`${t('onboarding.locked')} ${sec}s`);
  };

  useEffect(() => {
    if (pin.length < 4 || !activeVaultKey) return;
    (async () => {
      const result = await verifyPin(activeVaultKey, pin);
      clear();
      if (result.ok) {
        unlock();
        if (cloudSignedIn) {
          syncNow().catch(() => {});
        }
        router.replace('/(tabs)');
        return;
      }
      if (result.locked && result.retryAt) {
        updateLockMsg(result.retryAt);
      } else if (result.reason === 'no_pin') {
        router.replace('/create-pin');
      } else {
        setLockMsg(t('onboarding.pinIncorrect'));
      }
    })();
  }, [pin, clear, unlock, router, t, activeVaultKey, cloudSignedIn, syncNow]);

  const tryBio = async () => {
    if (!activeVaultKey) return;
    const hw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hw || !enrolled) {
      setLockMsg(t('onboarding.biometricsUnavailable'));
      return;
    }
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: t('onboarding.useBiometrics'),
      fallbackLabel: t('onboarding.loginTitle'),
      cancelLabel: t('common.cancel'),
    });
    if (res.success) {
      unlock();
      if (cloudSignedIn) {
        syncNow().catch(() => {});
      }
      router.replace('/(tabs)');
    }
  };

  const backToWelcome = () => {
    const notice = cloudSignedIn
      ? `${t('onboarding.backToWelcomeConfirm')}\n\n${t('onboarding.backToWelcomePendingNote')}`
      : t('onboarding.backToWelcomeConfirm');
    Alert.alert(t('onboarding.backToWelcome'), notice, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('onboarding.backToWelcome'),
        style: 'destructive',
        onPress: async () => {
          setBusyExit(true);
          try {
            await exitToWelcomeFromLock();
            router.replace('/welcome');
          } finally {
            setBusyExit(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          <View
            style={{
              backgroundColor: colors.primarySoft,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 11 }}>
              SESSION SECURE
            </Text>
          </View>
          <View
            style={{
              backgroundColor: colors.badgeBg,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: colors.success, fontWeight: '700', fontSize: 11 }}>
              Vault active
            </Text>
          </View>
        </View>

        <HeroIcon name="lock-closed" badgeName="key" />
        <Text style={[typography.title, { textAlign: 'center' }]}>{t('onboarding.loginTitle')}</Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Enter your 4-digit PIN to access GigBudget.
        </Text>
        {lockMsg ? (
          <Text style={{ color: colors.danger, textAlign: 'center', fontWeight: '600' }}>{lockMsg}</Text>
        ) : null}
        <PinDots filled={pin.length} />
        <Keypad onKey={onKey} showDecimal={false} biometricSlot={bio} onBiometric={tryBio} />
        {bio ? <Button title={t('onboarding.useBiometrics')} onPress={tryBio} /> : null}
        <Pressable onPress={backToWelcome} disabled={busyExit} style={{ alignItems: 'center', padding: spacing.md }}>
          <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>
            {busyExit ? '…' : t('onboarding.backToWelcome')}
          </Text>
        </Pressable>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 12 }}>
          PIN is stored on this device for your account only.
        </Text>
      </View>
    </Screen>
  );
}
