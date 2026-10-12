import { useCallback, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import MoneyText from '../../src/components/MoneyText';
import Button from '../../src/components/Button';
import { getTransaction, deleteTransaction } from '../../src/db/database';
import { formatDisplayDate } from '../../src/utils/dateColombo';
import { useApp } from '../../src/context/AppContext';
import { colors, typography } from '../../src/theme';

export default function ExpenseDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { refresh, refreshToken, t } = useApp();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        const next = await getTransaction(id);
        if (active) {
          setRow(next);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [id, refreshToken])
  );

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (!row) {
    return (
      <Screen>
        <Text>{t('common.error')}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Card>
        <Text style={typography.subtitle}>Expense</Text>
        <MoneyText cents={row.amount_cents} variant="expense" style={{ fontSize: 24 }} />
        <Text style={styles.line}>
          {t('expenses.category') || 'Category'}: {row.category_name || '—'}
        </Text>
        <Text style={styles.line}>Date: {formatDisplayDate(row.date_key)}</Text>
        {row.note ? <Text style={styles.line}>Note: {row.note}</Text> : null}
        {row.platform ? <Text style={styles.line}>Platform: {row.platform}</Text> : null}
      </Card>
      <Button title={t('common.edit')} onPress={() => router.push(`/expense/edit/${id}`)} />
      <Button
        title={t('common.delete')}
        variant="danger"
        onPress={async () => {
          await deleteTransaction(id);
          await refresh();
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { marginTop: 8, color: colors.textSecondary },
});
