import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}) {
  const { colors, radii, spacing } = useTheme();
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';

  const bg = isGhost
    ? 'transparent'
    : isSecondary
      ? colors.surface
      : isDanger
        ? colors.danger
        : colors.primary;
  const border = isSecondary || isGhost ? colors.primary : 'transparent';
  const textColor = isSecondary || isGhost ? colors.primaryDark : colors.textOnPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radii.lg,
          borderWidth: isSecondary || isGhost ? 1.5 : 0,
          borderColor: border,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 52,
          opacity: disabled || loading ? 0.55 : pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary || isGhost ? colors.primary : colors.textOnPrimary} />
      ) : (
        <Text style={{ color: textColor, fontWeight: '700', fontSize: 16 }}>{title}</Text>
      )}
    </Pressable>
  );
}
