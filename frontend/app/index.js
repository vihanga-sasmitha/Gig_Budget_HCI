import { Redirect } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useApp } from '../src/context/AppContext';
import { resolveLaunchHref } from '../src/api/sessionStorage';
import { colors } from '../src/theme';

export default function Index() {
  const {
    ready,
    onboardingComplete,
    unlocked,
    activeVaultKey,
    onboardingStep,
    onboardingPath,
    hasPin,
    sessionMode,
  } = useApp();

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const href = resolveLaunchHref({
    ready,
    sessionMode,
    securityComplete: onboardingComplete,
    unlocked,
    activeVaultKey,
    onboardingStep,
    onboardingPath,
    hasPin,
  });

  if (!href) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={href} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
