import { View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

const LETTERS = {
  2: 'ABC',
  3: 'DEF',
  4: 'GHI',
  5: 'JKL',
  6: 'MNO',
  7: 'PQRS',
  8: 'TUV',
  9: 'WXYZ',
  0: '+',
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

export default function Keypad({ onKey, showDecimal = true, biometricSlot = false, onBiometric }) {
  const { colors, radii, spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.sm,
      }}
    >
      {KEYS.map((key) => {
        if (key === '.' && !showDecimal) {
          if (biometricSlot) {
            return (
              <Pressable
                key="bio"
                onPress={onBiometric}
                style={{
                  width: '30%',
                  minWidth: 96,
                  aspectRatio: 1.35,
                  backgroundColor: colors.primarySoft,
                  borderRadius: radii.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="finger-print" size={28} color={colors.primary} />
              </Pressable>
            );
          }
          return <View key="spacer" style={{ width: '30%', minWidth: 96, aspectRatio: 1.35 }} />;
        }
        if (key === 'back') {
          return (
            <Pressable
              key={key}
              style={{
                width: '30%',
                minWidth: 96,
                aspectRatio: 1.35,
                backgroundColor: colors.keypad,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => onKey('back')}
            >
              <Ionicons name="backspace-outline" size={24} color={colors.text} />
            </Pressable>
          );
        }
        return (
          <Pressable
            key={key}
            style={{
              width: '30%',
              minWidth: 96,
              aspectRatio: 1.35,
              backgroundColor: colors.keypad,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => onKey(key)}
          >
            <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>{key}</Text>
            {LETTERS[key] ? (
              <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>
                {LETTERS[key]}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
