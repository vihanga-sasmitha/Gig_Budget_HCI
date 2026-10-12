import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import MoneyText from '../../src/components/MoneyText';
import Button from '../../src/components/Button';
import EmptyState from '../../src/components/EmptyState';
import { useApp } from '../../src/context/AppContext';
import { listTransactions } from '../../src/db/database';
import { formatDisplayDate } from '../../src/utils/dateColombo';
import { colors, spacing } from '../../src/theme';

export default function IncomeList() {
  const router = useRouter();
  const { refreshToken, t } = useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await listTransactions({ kind: 'income', limit: 100 }));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  return (
    <Screen scroll>
      <Button title={t('income.add')} onPress={() => router.push('/income/new')} />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : rows.length === 0 ? (
        <EmptyState message={t('common.empty')} />
      ) : (
        rows.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/income/${item.id}`)}>
            <Card style={styles.card}>
              <Text style={styles.title}>{item.category_name || item.platform || 'Income'}</Text>
              <Text style={styles.date}>{formatDisplayDate(item.date_key)}</Text>
              <MoneyText cents={item.amount_cents} variant="income" />
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.sm },
  title: { fontWeight: '600' },
  date: { color: colors.textSecondary, fontSize: 13 },
});
