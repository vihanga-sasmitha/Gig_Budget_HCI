import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export default function HeroIcon({ name = 'lock-closed', badgeName, size = 72 }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignSelf: 'center', marginVertical: 12 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={name} size={size * 0.42} color={colors.textOnPrimary} />
      </View>
      {badgeName ? (
        <View
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.primaryDark,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.background,
          }}
        >
          <Ionicons name={badgeName} size={14} color="#fff" />
        </View>
      ) : null}
    </View>
  );
}
