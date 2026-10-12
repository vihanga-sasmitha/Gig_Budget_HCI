import { View } from 'react-native';
import { useTheme } from '../theme';

export default function PinDots({ length = 4, filled = 0 }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'center' }}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: i < filled ? colors.primary : 'transparent',
            borderWidth: i < filled ? 0 : 2,
            borderColor: colors.border,
          }}
        />
      ))}
    </View>
  );
}
