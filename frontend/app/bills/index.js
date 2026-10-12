import { useCallback, useEffect, useState } from 'react';
import { Text, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import MoneyText from '../../src/components/MoneyText';
import EmptyState from '../../src/components/EmptyState';
import DateField from '../../src/components/DateField';
import { useApp } from '../../src/context/AppContext';
import { listBills, createBill, markBillPaid } from '../../src/db/database';
import { parseMoneyInputToCents } from '../../src/utils/money';
import { colomboDateKey, formatDisplayDate } from '../../src/utils/dateColombo';
import { colors, spacing, typography } from '../../src/theme';

export default function BillsList() {
  const router = useRouter();
  const { refreshToken, refresh, t } = useApp();
  const [bills, setBills] = useState([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState(colomboDateKey());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setBills(await listBills());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const add = async () => {
    if (!name || !amount || !due) return;
    await createBill({
      name,
      amount_cents: parseMoneyInputToCents(amount),
      due_key: due,
    });
    setName('');
    setAmount('');
    setDue(colomboDateKey());
    await refresh();
    load();
  };

  return (
    <Screen scroll>
      <Text style={typography.subtitle}>{t('bills.add')}</Text>
      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="Amount"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <DateField
        label={t('bills.due') || 'Due date'}
        value={due}
        onChange={setDue}
        placeholder="Select due date"
      />
      <Button title={t('common.save')} onPress={add} />
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : bills.length === 0 ? (
        <EmptyState message={t('common.empty')} />
      ) : (
        bills.map((b) => (
          <Pressable key={b.id} onPress={() => router.push(`/bills/${b.id}`)}>
            <Card style={styles.card}>
              <Text style={styles.title}>{b.name}</Text>
              <Text style={styles.due}>
                {t('bills.due')} {formatDisplayDate(b.due_key)}
              </Text>
              <MoneyText cents={b.amount_cents} variant="expense" />
              {!b.paid ? (
                <Button
                  title={t('bills.markPaid')}
                  variant="secondary"
                  onPress={async () => {
                    await markBillPaid(b.id, 1);
                    await refresh();
                    load();
                  }}
                />
              ) : (
                <Text style={styles.paid}>Paid</Text>
              )}
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  card: { marginTop: spacing.sm, gap: spacing.xs },
  title: { fontWeight: '700' },
  due: { color: colors.textSecondary },
  paid: { color: colors.success, fontWeight: '600' },
});
