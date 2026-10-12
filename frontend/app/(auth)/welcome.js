import { Text, StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import Card from '../../src/components/Card';
import WelcomeHero from '../../src/illustrations/WelcomeHero';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/theme';

const CHIPS = [
  { label: 'Rideshare', icon: 'car-outline' },
  { label: 'Courier', icon: 'bicycle-outline' },
  { label: 'Freelance', icon: 'laptop-outline' },
];

export default function Welcome() {
  const router = useRouter();
  const {
    t,
    updateOnboardingPath,
    updateOnboardingStep,
    onboardingComplete,
    activeVaultKey,
    sessionMode,
    hasOfflineProfile,
  } = useApp();
  const { colors, spacing, typography, radii } = useTheme();

  const securityReady = onboardingComplete;
  const atAccountPicker =
    sessionMode === 'account_selection' || (securityReady && !activeVaultKey);

  const goSignIn = async () => {
    await updateOnboardingPath('cloud');
    await updateOnboardingStep('sign_in');
    router.push('/sign-in');
  };

  const goRegister = async () => {
    await updateOnboardingPath('cloud');
    await updateOnboardingStep('register');
    router.push('/register');
  };

  const goOffline = async () => {
    await updateOnboardingPath('offline');
    await updateOnboardingStep('offline_profile');
    router.push('/offline-profile');
  };

  return (
    <Screen scroll>
      <View style={{ alignItems: 'center', paddingTop: spacing.lg, gap: spacing.md }}>
        <WelcomeHero size={128} />
        <Text style={{ ...typography.brand }}>{t('appName')}</Text>
        <Text style={{ ...typography.title, textAlign: 'center' }}>{t('onboarding.welcomeTitle')}</Text>
        <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}>
          Track your income, control your expenses, and build savings — online or offline.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
          {CHIPS.map((c) => (
            <View
              key={c.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.primarySoft,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radii.pill,
              }}
            >
              <Ionicons name={c.icon} size={14} color={colors.primaryDark} />
              <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 12 }}>{c.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        {[
          {
            icon: 'trending-up-outline',
            title: 'Track daily income',
            body: 'Log multi-platform payouts and keep a clear day total.',
          },
          {
            icon: 'receipt-outline',
            title: 'Control expenses',
            body: 'Quick keypad entry with categories that stay on this device.',
          },
          {
            icon: 'wallet-outline',
            title: 'Build savings',
            body: 'Goals, bills, and budgets that work even when you are offline.',
          },
        ].map((item) => (
          <Card key={item.title} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={item.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 4 }}>{item.title}</Text>
              <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{item.body}</Text>
            </View>
          </Card>
        ))}
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.lg }}>
        <Button title="Get started — create account" onPress={goRegister} />
        <Button title={t('onboarding.signIn')} variant="secondary" onPress={goSignIn} />
        <Pressable onPress={goOffline} style={{ alignItems: 'center', paddingVertical: spacing.md }}>
          <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 16 }}>
            {hasOfflineProfile
              ? t('onboarding.continueOfflineResume')
              : t('onboarding.continueOffline')}
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          <Ionicons name="lock-closed" size={14} color={colors.success} />
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            Your data stays private on this device.
          </Text>
        </View>
        {atAccountPicker ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
            {t('onboarding.signedOutHint')}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
