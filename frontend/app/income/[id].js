import { useEffect, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import MoneyText from '../../src/components/MoneyText';
import Button from '../../src/components/Button';
import { getTransaction, deleteTransaction } from '../../src/db/database';
import { formatDisplayDate } from '../../src/utils/dateColombo';
import { useApp } from '../../src/context/AppContext';
import { colors, typography } from '../../src/theme';

export default function IncomeDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { refresh, t } = useApp();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransaction(id).then((r) => {
      setRow(r);
      setLoading(false);
    });
  }, [id]);

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
        <Text style={typography.subtitle}>{t('income.title')}</Text>
        <MoneyText cents={row.amount_cents} variant="income" style={{ fontSize: 24 }} />
        <Text style={styles.line}>{formatDisplayDate(row.date_key)}</Text>
        {row.platform ? <Text style={styles.line}>{row.platform}</Text> : null}
        {row.note ? <Text style={styles.line}>{row.note}</Text> : null}
      </Card>
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
