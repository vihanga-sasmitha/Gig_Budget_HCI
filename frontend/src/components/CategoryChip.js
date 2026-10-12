import { Pressable, Text } from 'react-native';
import { useTheme } from '../theme';

export default function CategoryChip({ label, color, selected, onPress }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: selected ? color || colors.primary : colors.border,
        backgroundColor: selected ? color || colors.primary : colors.surface,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
      }}
    >
      <Text
        style={{
          color: selected ? colors.textOnPrimary : colors.text,
          fontSize: 14,
          fontWeight: selected ? '700' : '400',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
