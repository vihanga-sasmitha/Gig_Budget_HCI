import { useCallback, useState } from 'react';
import { Text, StyleSheet, TextInput, ActivityIndicator, Alert, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import MoneyText from '../../src/components/MoneyText';
import Button from '../../src/components/Button';
import DateField from '../../src/components/DateField';
import {
  listSavingsGoals,
  addSavingsMove,
  deleteSavingsGoal,
  updateSavingsGoal,
} from '../../src/db/database';
import { parseMoneyInputToCents, formatLKR } from '../../src/utils/money';
import { formatDisplayDate } from '../../src/utils/dateColombo';
import { useApp } from '../../src/context/AppContext';
import { colors, spacing, typography } from '../../src/theme';

export default function SavingsDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { refresh, refreshToken, t } = useApp();
  const [goal, setGoal] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    const goals = await listSavingsGoals();
    const row = goals.find((g) => g.id === id) || null;
    setGoal(row);
    if (row) {
      setName(row.name || '');
      setTarget((row.target_cents / 100).toFixed(2));
      setDeadline(row.deadline_key || '');
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload, refreshToken])
  );

  const move = async (type) => {
    const cents = parseMoneyInputToCents(amount);
    if (!cents) return;
    try {
      await addSavingsMove(id, cents, type);
      setAmount('');
      await refresh();
      reload();
    } catch (e) {
      Alert.alert(t('common.error'), e.message || 'Unable to update savings');
    }
  };

  const startEdit = () => {
    if (!goal) return;
    setName(goal.name || '');
    setTarget((goal.target_cents / 100).toFixed(2));
    setDeadline(goal.deadline_key || '');
    setError('');
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!goal || saving) return;
    const cents = parseMoneyInputToCents(target);
    if (!name.trim()) {
      setError('Enter a goal name');
      return;
    }
    if (!cents || cents <= 0) {
      setError('Enter a valid target amount');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateSavingsGoal(id, {
        name: name.trim(),
        target_cents: cents,
        deadline_key: deadline || null,
      });
      setGoal(updated);
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

  if (!goal) {
    return (
      <Screen>
        <Text>{t('common.error')}</Text>
      </Screen>
    );
  }

  if (editing) {
    return (
      <Screen scroll>
        <Text style={typography.subtitle}>{t('common.edit') || 'Edit goal'}</Text>
        <Text style={styles.fieldLabel}>Goal name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} editable={!saving} />
        <Text style={styles.fieldLabel}>{t('savings.target') || 'Target amount'}</Text>
        <TextInput
          style={styles.input}
          value={target}
          onChangeText={setTarget}
          keyboardType="decimal-pad"
          editable={!saving}
        />
        <DateField
          label="Deadline"
          value={deadline}
          onChange={setDeadline}
          placeholder="Select deadline (optional)"
          optional
          disabled={saving}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={`${t('common.save')} · ${formatLKR(parseMoneyInputToCents(target))}`}
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
        <Text style={typography.subtitle}>{goal.name}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{t('savings.contributed')}: </Text>
          <MoneyText cents={goal.current_cents} variant="income" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('savings.target')}: </Text>
          <MoneyText cents={goal.target_cents} />
        </View>
        {goal.deadline_key ? (
          <Text style={styles.deadline}>
            Deadline: {formatDisplayDate(goal.deadline_key)}
          </Text>
        ) : (
          <Text style={styles.deadline}>No deadline set</Text>
        )}
      </Card>
      <Button title={t('common.edit') || 'Edit'} onPress={startEdit} />
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="Amount"
        value={amount}
        onChangeText={setAmount}
      />
      <Button title={t('savings.contribute')} onPress={() => move('contribution')} />
      <Button title={t('savings.withdraw')} variant="secondary" onPress={() => move('withdrawal')} />
      <Button
        title={t('common.delete')}
        variant="danger"
        onPress={() =>
          Alert.alert(t('common.delete'), '', [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.delete'),
              style: 'destructive',
              onPress: async () => {
                await deleteSavingsGoal(id);
                await refresh();
                router.back();
              },
            },
          ])
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: spacing.xs },
  label: { color: colors.textSecondary },
  fieldLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  deadline: { marginTop: spacing.sm, color: colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginVertical: spacing.sm,
    color: colors.text,
  },
  error: { color: colors.danger, marginBottom: spacing.md },
});
