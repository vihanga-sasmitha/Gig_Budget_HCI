import { View, Text } from 'react-native';
import { useTheme } from '../theme';

export default function StepBadge({ step, total }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      style={{
        alignSelf: 'center',
        backgroundColor: colors.primarySoft,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: radii.pill,
      }}
    >
      <Text style={{ color: colors.primaryDark, fontWeight: '800', fontSize: 12, letterSpacing: 0.6 }}>
        STEP {step} OF {total}
      </Text>
    </View>
  );
}
