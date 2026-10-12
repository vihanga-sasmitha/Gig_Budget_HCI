import { Text, Pressable, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/theme';

const LINKS = [
  { href: '/settings/profile', icon: 'person-outline', key: 'settings.profile', section: 'Account' },
  { href: '/settings/cloud', icon: 'cloud-outline', key: 'settings.cloudAccount', section: 'Account' },
  { href: '/settings/appearance', icon: 'contrast-outline', label: 'Appearance', section: 'Preferences' },
  { href: '/settings/currency', icon: 'cash-outline', label: 'Currency', section: 'Preferences' },
  { href: '/settings/language', icon: 'language-outline', key: 'settings.language', section: 'Preferences' },
  { href: '/settings/pin', icon: 'lock-closed-outline', key: 'settings.pin', section: 'Security' },
  { href: '/settings/sync', icon: 'sync-outline', key: 'settings.sync', section: 'Data' },
  { href: '/settings/export', icon: 'download-outline', key: 'settings.export', section: 'Data' },
  { href: '/reports/generate', icon: 'document-text-outline', label: 'Financial reports', section: 'Data' },
  { href: '/notifications', icon: 'notifications-outline', key: 'notifications.title', section: 'More' },
  { href: '/savings', icon: 'flag-outline', key: 'savings.title', section: 'More' },
  { href: '/bills', icon: 'calendar-outline', key: 'bills.title', section: 'More' },
  { href: '/income', icon: 'wallet-outline', key: 'income.title', section: 'More' },
];

export default function SettingsTab() {
  const router = useRouter();
  const {
    t,
    lock,
    profile,
    outboxCount,
    online,
    cloudSignedIn,
    cloudUser,
    confirmLogoutFlow,
    displayCurrency,
  } = useApp();
  const { colors, spacing, typography } = useTheme();

  const lockApp = () => {
    lock();
    router.replace('/login');
  };

  const logOut = async () => {
    const result = await confirmLogoutFlow();
    if (!result?.ok) return;
    if (result.wasCloud && !result.remoteRevoked) {
      Alert.alert(t('settings.logOut'), t('settings.signedOutLocalOnly'));
    }
    router.replace('/welcome');
  };

  return (
    <Screen scroll>
      <Card style={{ marginBottom: spacing.md, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.textOnPrimary, fontWeight: '800', fontSize: 18 }}>
              {(profile?.name || 'G').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.subtitle}>{profile?.name || t('settings.defaultName')}</Text>
            <Text style={{ color: colors.textSecondary }}>Display: {displayCurrency}</Text>
            {cloudSignedIn && cloudUser ? (
              <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>{cloudUser.email}</Text>
            ) : (
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
                {t('settings.offlineProfile')}
              </Text>
            )}
          </View>
        </View>
        {!online ? <Text style={{ color: colors.warning }}>{t('common.offline')}</Text> : null}
        {outboxCount > 0 ? (
          <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>
            {t('settings.pending')}: {outboxCount}
          </Text>
        ) : null}
      </Card>

      {LINKS.map((link, idx) => {
        const prev = LINKS[idx - 1];
        const showSection = !prev || prev.section !== link.section;
        return (
          <View key={link.href}>
            {showSection ? (
              <Text
                style={{
                  marginTop: spacing.md,
                  marginBottom: spacing.sm,
                  color: colors.primaryDark,
                  fontWeight: '800',
                  fontSize: 12,
                  letterSpacing: 0.6,
                }}
              >
                {link.section.toUpperCase()}
              </Text>
            ) : null}
            <Pressable onPress={() => router.push(link.href)}>
              <Card
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  marginBottom: spacing.sm,
                }}
              >
                <Ionicons name={link.icon} size={22} color={colors.primary} />
                <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>
                  {link.label || t(link.key)}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Card>
            </Pressable>
          </View>
        );
      })}

      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        <Button title={t('settings.lockApp')} variant="secondary" onPress={lockApp} />
        <Button title={t('settings.logOut')} variant="danger" onPress={logOut} />
        <Text style={{ color: colors.textSecondary, lineHeight: 20, marginTop: spacing.xs }}>
          {cloudSignedIn ? t('settings.logOutHintCloud') : t('settings.logOutHintOffline')}
        </Text>
      </View>
    </Screen>
  );
}
