import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import EmptyIllustration from '../illustrations/EmptyIllustration';

const ILLUSTRATION_ICONS = {
  transactions: 'receipt-outline',
  savings: 'flag-outline',
  reminders: 'notifications-outline',
  default: 'file-tray-outline',
};

export default function EmptyState({ icon, message, title, illustration }) {
  const { colors, spacing, typography } = useTheme();
  const resolvedIcon =
    icon || ILLUSTRATION_ICONS[illustration] || ILLUSTRATION_ICONS.default;

  return (
    <View style={{ alignItems: 'center', padding: spacing.xl, gap: spacing.md }}>
      {illustration ? (
        <EmptyIllustration kind={illustration} />
      ) : (
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={resolvedIcon} size={40} color={colors.primary} />
        </View>
      )}
      {title ? <Text style={typography.subtitle}>{title}</Text> : null}
      <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}>
        {message}
      </Text>
    </View>
  );
}
