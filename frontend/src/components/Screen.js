import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

export default function Screen({
  children,
  scroll,
  refreshing,
  onRefresh,
  edges = ['top', 'left', 'right'],
  padded = true,
}) {
  const { colors, spacing } = useTheme();
  const pad = padded ? spacing.md : 0;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={{ padding: pad, paddingBottom: spacing.xl * 2 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: pad }}>{children}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={edges}>
      {body}
    </SafeAreaView>
  );
}
