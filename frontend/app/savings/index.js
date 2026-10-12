import { useCallback, useEffect, useState } from 'react';
import { Text, StyleSheet, TextInput, Pressable, ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import MoneyText from '../../src/components/MoneyText';
import EmptyState from '../../src/components/EmptyState';
import DateField from '../../src/components/DateField';
import { useApp } from '../../src/context/AppContext';
import { listSavingsGoals, createSavingsGoal } from '../../src/db/database';
import { parseMoneyInputToCents } from '../../src/utils/money';
import { formatDisplayDate } from '../../src/utils/dateColombo';
import { colors, spacing, typography } from '../../src/theme';

export default function SavingsList() {
  const router = useRouter();
  const { refreshToken, refresh, t } = useApp();
  const [goals, setGoals] = useState([]);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setGoals(await listSavingsGoals());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const add = async () => {
    if (!name || !target) return;
    await createSavingsGoal({
      name,
      target_cents: parseMoneyInputToCents(target),
      deadline_key: deadline || null,
    });
    setName('');
    setTarget('');
    setDeadline('');
    await refresh();
    load();
  };

  return (
    <Screen scroll>
      <Text style={typography.subtitle}>{t('savings.addGoal')}</Text>
      <TextInput style={styles.input} placeholder="Goal name" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder={t('savings.target')}
        keyboardType="decimal-pad"
        value={target}
        onChangeText={setTarget}
      />
      <DateField
        label="Deadline"
        value={deadline}
        onChange={setDeadline}
        placeholder="Select deadline (optional)"
        optional
      />
      <Button title={t('common.save')} onPress={add} />
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : goals.length === 0 ? (
        <EmptyState message={t('common.empty')} />
      ) : (
        goals.map((g) => (
          <Pressable key={g.id} onPress={() => router.push(`/savings/${g.id}`)}>
            <Card style={styles.card}>
              <Text style={styles.title}>{g.name}</Text>
              <View style={styles.amounts}>
                <MoneyText cents={g.current_cents} />
                <Text style={styles.sep}> / </Text>
                <MoneyText cents={g.target_cents} />
              </View>
              {g.deadline_key ? (
                <Text style={styles.deadline}>Deadline: {formatDisplayDate(g.deadline_key)}</Text>
              ) : null}
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
  card: { marginTop: spacing.sm },
  title: { fontWeight: '700', marginBottom: spacing.xs },
  amounts: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  sep: { color: colors.textSecondary },
  deadline: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: 13 },
});
