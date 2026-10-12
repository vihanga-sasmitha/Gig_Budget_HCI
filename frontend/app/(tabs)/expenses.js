import { useCallback, useEffect, useState } from 'react';
import { Text, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import MoneyText from '../../src/components/MoneyText';
import Button from '../../src/components/Button';
import EmptyState from '../../src/components/EmptyState';
import { useApp } from '../../src/context/AppContext';
import { listTransactions } from '../../src/db/database';
import { formatDisplayDate } from '../../src/utils/dateColombo';
import { useTheme } from '../../src/theme';

export default function ExpensesTab() {
  const router = useRouter();
  const { refreshToken, t } = useApp();
  const { colors, spacing, typography } = useTheme();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listTransactions({ kind: 'expense', limit: 100 });
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  return (
    <Screen scroll>
      <Button title={t('expenses.quickAdd')} onPress={() => router.push('/expense/quick')} />
      <Text style={{ ...typography.subtitle, marginVertical: spacing.md }}>
        {t('expenses.history')}
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : rows.length === 0 ? (
        <EmptyState message={t('common.empty')} illustration="transactions" />
      ) : (
        rows.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/expense/${item.id}`)}>
            <Card style={{ marginBottom: spacing.sm }}>
              <Text style={{ fontWeight: '600', color: colors.text }}>
                {item.category_name || 'Expense'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {formatDisplayDate(item.date_key)}
              </Text>
              {item.note ? (
                <Text style={{ color: colors.textSecondary, marginVertical: 4 }}>{item.note}</Text>
              ) : null}
              <MoneyText cents={item.amount_cents} variant="expense" />
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
