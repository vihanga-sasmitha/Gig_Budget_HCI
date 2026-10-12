import { Text, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import { useApp } from '../../src/context/AppContext';
import { useTheme, setStoredAppearanceMode } from '../../src/theme';

const OPTIONS = [
  { id: 'light', label: 'Light', icon: 'sunny-outline' },
  { id: 'dark', label: 'Dark', icon: 'moon-outline' },
  { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export default function AppearanceSettings() {
  const { vaultAppearanceMode, setVaultAppearancePreference, activeVaultKey } = useApp();
  const { colors, spacing, typography, appearanceMode, setAppearanceMode } = useTheme();
  const selected = vaultAppearanceMode || appearanceMode || 'system';

  const choose = async (id) => {
    if (activeVaultKey) {
      await setVaultAppearancePreference(id);
    }
    await setAppearanceMode(id);
    await setStoredAppearanceMode(id);
  };

  return (
    <Screen scroll>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
        Choose how GigBudget looks. System follows your device setting.
      </Text>
      {OPTIONS.map((opt) => {
        const active = selected === opt.id;
        return (
          <Pressable key={opt.id} onPress={() => choose(opt.id)}>
            <Card
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                marginBottom: spacing.sm,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primarySoft : colors.surface,
              }}
            >
              <Ionicons name={opt.icon} size={22} color={colors.primary} />
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: colors.text }}>
                {opt.label}
              </Text>
              {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
            </Card>
          </Pressable>
        );
      })}
      <Text style={[typography.caption, { marginTop: spacing.md }]}>
        Preference is stored for this profile on this device.
      </Text>
    </Screen>
  );
}
