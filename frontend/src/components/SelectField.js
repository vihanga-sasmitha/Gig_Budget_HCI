import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

/**
 * Simple dropdown select for forms (no extra native picker dependency).
 * options: [{ value, label }]
 */
export default function SelectField({
  label,
  value,
  options = [],
  placeholder = 'Select…',
  onChange,
  disabled = false,
}) {
  const { colors, spacing, typography, radii } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const display = selected?.label || placeholder;

  return (
    <View style={{ marginBottom: spacing.sm }}>
      {label ? (
        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            fontWeight: '600',
            marginBottom: spacing.xs,
          }}
        >
          {label}
        </Text>
      ) : null}
      <Pressable
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          backgroundColor: colors.inputBg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          opacity: disabled ? 0.6 : 1,
        }}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <Text
          style={{
            flex: 1,
            color: selected ? colors.text : colors.textSecondary,
            fontSize: 16,
          }}
          numberOfLines={1}
        >
          {display}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: 'center',
            padding: spacing.lg,
          }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              maxHeight: '70%',
              paddingTop: spacing.md,
              overflow: 'hidden',
            }}
            onPress={() => {}}
          >
            {label ? (
              <Text
                style={{
                  ...typography.subtitle,
                  paddingHorizontal: spacing.md,
                  marginBottom: spacing.sm,
                }}
              >
                {label}
              </Text>
            ) : null}
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <Pressable
                    key={String(opt.value)}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: active ? colors.primarySoft : 'transparent',
                    }}
                    onPress={() => {
                      onChange?.(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={{
                        color: active ? colors.primaryDark : colors.text,
                        fontSize: 16,
                        flex: 1,
                        fontWeight: active ? '700' : '400',
                      }}
                    >
                      {opt.label}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={colors.primaryDark} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              style={{
                padding: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                alignItems: 'center',
              }}
              onPress={() => setOpen(false)}
            >
              <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
