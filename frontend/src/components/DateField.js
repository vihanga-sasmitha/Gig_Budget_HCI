import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colomboDateKey, formatDisplayDate } from '../utils/dateColombo';
import { useTheme } from '../theme';

function parseDateKey(dateKey) {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Tap-to-select date field storing YYYY-MM-DD keys (Asia/Colombo display).
 */
export default function DateField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  optional = false,
  disabled = false,
  minimumDate,
  maximumDate,
}) {
  const { colors, spacing, typography, radii } = useTheme();
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseDateKey(value) || new Date(), [value]);
  const hasValue = Boolean(value && parseDateKey(value));

  const commit = (date) => {
    onChange?.(colomboDateKey(date));
  };

  const onAndroidChange = (_event, date) => {
    setOpen(false);
    if (date) commit(date);
  };

  const onIosChange = (_event, date) => {
    if (date) commit(date);
  };

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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            backgroundColor: colors.inputBg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            opacity: disabled ? 0.6 : 1,
          }}
          onPress={() => !disabled && setOpen(true)}
          disabled={disabled}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.primaryDark} />
          <Text
            style={{
              flex: 1,
              color: hasValue ? colors.text : colors.textSecondary,
              fontSize: 16,
            }}
            numberOfLines={1}
          >
            {hasValue ? formatDisplayDate(value) : placeholder}
          </Text>
        </Pressable>
        {optional && hasValue && !disabled ? (
          <Pressable
            style={{ padding: spacing.xs }}
            onPress={() => onChange?.(null)}
            accessibilityLabel="Clear date"
          >
            <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable
            style={{
              flex: 1,
              backgroundColor: colors.overlay,
              justifyContent: 'flex-end',
            }}
            onPress={() => setOpen(false)}
          >
            <Pressable
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: radii.lg,
                borderTopRightRadius: radii.lg,
                paddingBottom: spacing.lg,
              }}
              onPress={() => {}}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={typography.subtitle}>{label || 'Select date'}</Text>
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 16 }}>
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={onIosChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={{ alignSelf: 'stretch' }}
              />
              {optional ? (
                <Pressable
                  style={{ alignItems: 'center', padding: spacing.md }}
                  onPress={() => {
                    onChange?.(null);
                    setOpen(false);
                  }}
                >
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Clear date</Text>
                </Pressable>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
