import { useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import MoneyText from '../../src/components/MoneyText';
import Button from '../../src/components/Button';
import { getTransaction } from '../../src/db/database';
import { formatDisplayDate } from '../../src/utils/dateColombo';
import { useApp } from '../../src/context/AppContext';
import { colors, spacing, typography, radii } from '../../src/theme';

export default function ExpenseConfirm() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { online, t } = useApp();
  const [row, setRow] = useState(null);

  useEffect(() => {
    if (id) getTransaction(id).then(setRow);
  }, [id]);

  return (
    <Screen scroll>
      <View style={styles.banner}>
        <Ionicons name="flash" size={16} color={colors.text} />
        <Text style={styles.bannerText}>
          {online
            ? 'Saved locally — sync when cloud account is linked'
            : 'Offline Mode — Saved to Local Vault'}
        </Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={40} color={colors.surface} />
        </View>
        <Text style={styles.title}>Expense Saved</Text>
        <Text style={styles.sub}>
          Your expense has been saved locally and will sync when you are back online.
        </Text>
      </View>

      {row ? (
        <Card>
          <Text style={styles.label}>Amount</Text>
          <MoneyText cents={row.amount_cents} variant="expense" style={{ fontSize: 22 }} />
          <Text style={styles.label}>Category</Text>
          <Text style={styles.value}>{row.category_name || '—'}</Text>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{formatDisplayDate(row.date_key)}</Text>
          {row.note ? (
            <>
              <Text style={styles.label}>Note</Text>
              <Text style={styles.value}>{row.note}</Text>
            </>
          ) : null}
        </Card>
      ) : null}

      <Button title="Done" onPress={() => router.replace('/(tabs)/expenses')} />
      <Button
        title="Add another expense"
        variant="secondary"
        onPress={() => router.replace('/expense/quick')}
      />
      {id ? (
        <Button
          title={t('common.edit')}
          variant="secondary"
          onPress={() => router.push(`/expense/edit/${id}`)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFF4CC',
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  bannerText: { flex: 1, color: colors.text, fontWeight: '600' },
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.title, marginBottom: spacing.sm },
  sub: { ...typography.caption, textAlign: 'center', paddingHorizontal: spacing.lg },
  label: { ...typography.caption, marginTop: spacing.sm },
  value: { ...typography.body, fontWeight: '600' },
});
