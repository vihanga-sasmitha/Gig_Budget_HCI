import { useCallback, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import MoneyText from '../../src/components/MoneyText';
import Button from '../../src/components/Button';
import DateField from '../../src/components/DateField';
import { listBills, deleteBill, markBillPaid, updateBill } from '../../src/db/database';
import { formatDisplayDate } from '../../src/utils/dateColombo';
import { parseMoneyInputToCents, formatLKR } from '../../src/utils/money';
import { useApp } from '../../src/context/AppContext';
import { colors, spacing, typography } from '../../src/theme';

export default function BillDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { refresh, refreshToken, t } = useApp();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await listBills();
    const row = rows.find((b) => b.id === id) || null;
    setBill(row);
    if (row) {
      setName(row.name || '');
      setAmount((row.amount_cents / 100).toFixed(2));
      setDue(row.due_key || '');
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load, refreshToken])
  );

  const startEdit = () => {
    if (!bill) return;
    setName(bill.name || '');
    setAmount((bill.amount_cents / 100).toFixed(2));
    setDue(bill.due_key || '');
    setError('');
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!bill || saving) return;
    const cents = parseMoneyInputToCents(amount);
    if (!name.trim()) {
      setError('Enter a name');
      return;
    }
    if (!cents || cents <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!due) {
      setError('Select a due date');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateBill(id, {
        name: name.trim(),
        amount_cents: cents,
        due_key: due.trim(),
        recurrence: bill.recurrence || 'monthly',
        reminder_days: bill.reminder_days ?? 1,
      });
      setBill(updated);
      setEditing(false);
      await refresh();
    } catch (e) {
      setError(e.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (!bill) {
    return (
      <Screen>
        <Text>{t('common.error')}</Text>
      </Screen>
    );
  }

  if (editing) {
    return (
      <Screen scroll>
        <Text style={typography.subtitle}>{t('common.edit') || 'Edit bill'}</Text>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} editable={!saving} />
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          editable={!saving}
        />
        <DateField
          label={t('bills.due') || 'Due date'}
          value={due}
          onChange={setDue}
          placeholder="Select due date"
          disabled={saving}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={`${t('common.save')} · ${formatLKR(parseMoneyInputToCents(amount))}`}
          onPress={saveEdit}
          loading={saving}
          disabled={saving}
        />
        <Button
          title={t('common.cancel')}
          variant="secondary"
          onPress={() => {
            setEditing(false);
            setError('');
          }}
          disabled={saving}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Card>
        <Text style={typography.subtitle}>{bill.name}</Text>
        <MoneyText cents={bill.amount_cents} variant="expense" />
        <Text style={styles.line}>
          {t('bills.due')} {formatDisplayDate(bill.due_key)}
        </Text>
        <Text style={styles.line}>{bill.paid ? 'Paid' : 'Unpaid'}</Text>
      </Card>
      <Button title={t('common.edit') || 'Edit'} onPress={startEdit} />
      {!bill.paid ? (
        <Button
          title={t('bills.markPaid')}
          onPress={async () => {
            await markBillPaid(bill.id, 1);
            await refresh();
            router.back();
          }}
        />
      ) : null}
      <Button
        title={t('common.delete')}
        variant="danger"
        onPress={async () => {
          await deleteBill(id);
          await refresh();
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { marginTop: 8, color: colors.textSecondary },
  label: {
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  error: { color: colors.danger, marginBottom: spacing.md },
});
