import { useCallback, useEffect, useState } from 'react';
import { Text, TextInput, View, ActivityIndicator, Alert } from 'react-native';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import DonutChart from '../../src/charts/DonutChart';
import CategoryChip from '../../src/components/CategoryChip';
import MoneyText from '../../src/components/MoneyText';
import { useApp } from '../../src/context/AppContext';
import {
  listBudgets,
  createBudget,
  deleteBudget,
  budgetSpent,
  listCategories,
} from '../../src/db/database';
import { rangeForPeriod } from '../../src/utils/dateColombo';
import { parseMoneyInputToCents } from '../../src/utils/money';
import { useTheme } from '../../src/theme';

export default function BudgetTab() {
  const { refreshToken, refresh, t, ledgerCurrency } = useApp();
  const { colors, spacing, typography, radii } = useTheme();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [limitInput, setLimitInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, cats] = await Promise.all([listBudgets(), listCategories('expense')]);
    setCategories(cats);
    const palette = [colors.chartTeal, colors.chartAmber, colors.chartViolet];
    const enriched = await Promise.all(
      b.map(async (row) => {
        const { start, end } = rangeForPeriod(row.period || 'month');
        const spent = await budgetSpent(row.category_id, start, end);
        return { ...row, spent };
      })
    );
    setBudgets(enriched);
    setSegments(
      enriched.map((row, i) => ({
        label: row.category_name,
        value: row.spent || 1,
        color: palette[i % 3],
      }))
    );
    setLoading(false);
  }, [colors.chartTeal, colors.chartAmber, colors.chartViolet]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const addBudget = async () => {
    if (!selectedCat || !limitInput) return;
    await createBudget({
      category_id: selectedCat,
      amount_cents: parseMoneyInputToCents(limitInput),
    });
    setLimitInput('');
    setSelectedCat(null);
    await refresh();
    load();
  };

  const remove = (id) => {
    Alert.alert(t('common.delete'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteBudget(id);
          await refresh();
          load();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Text style={typography.subtitle}>{t('budget.overview')}</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm, fontSize: 13 }}>
        Limits are entered in {ledgerCurrency} (ledger currency).
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Card>
          <DonutChart
            segments={
              segments.length ? segments : [{ label: '—', value: 1, color: colors.border }]
            }
            centerLabel={t('budget.spent')}
          />
        </Card>
      )}

      <Text style={{ ...typography.subtitle, marginTop: spacing.lg, marginBottom: spacing.sm }}>
        {t('budget.add')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            label={c.name}
            color={c.color}
            selected={selectedCat === c.id}
            onPress={() => setSelectedCat(c.id)}
          />
        ))}
      </View>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.md,
          padding: spacing.md,
          backgroundColor: colors.inputBg,
          marginVertical: spacing.sm,
          color: colors.text,
        }}
        placeholder={`${t('budget.limit')} (${ledgerCurrency})`}
        placeholderTextColor={colors.textSecondary}
        keyboardType="decimal-pad"
        value={limitInput}
        onChangeText={setLimitInput}
      />
      <Button title={t('common.save')} onPress={addBudget} />

      {budgets.map((b) => (
        <Card key={b.id} style={{ marginTop: spacing.sm, gap: spacing.xs }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>
            {b.category_name}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
            <Text style={{ color: colors.text }}>{t('budget.spent')}: </Text>
            <MoneyText cents={b.spent} variant="expense" />
            <Text style={{ color: colors.text }}> / </Text>
            <MoneyText cents={b.amount_cents} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: spacing.sm,
            }}
          >
            <Text style={{ color: colors.text }}>{t('budget.remaining')}: </Text>
            <MoneyText cents={Math.max(b.amount_cents - b.spent, 0)} variant="income" />
          </View>
          <Button title={t('common.delete')} variant="danger" onPress={() => remove(b.id)} />
        </Card>
      ))}
    </Screen>
  );
}
