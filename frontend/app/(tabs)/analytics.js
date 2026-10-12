import { useCallback, useEffect, useState } from 'react';
import { Text, Pressable, ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import MoneyText from '../../src/components/MoneyText';
import BarChart from '../../src/charts/BarChart';
import { useApp } from '../../src/context/AppContext';
import {
  spendingByCategory,
  monthlyPerformance,
  sumTransactions,
} from '../../src/db/database';
import { rangeForPeriod } from '../../src/utils/dateColombo';
import { useTheme } from '../../src/theme';

const PERIODS = ['week', 'month', 'year'];

export default function AnalyticsTab() {
  const router = useRouter();
  const { refreshToken, t, displayCurrency } = useApp();
  const { colors, spacing, typography, radii } = useTheme();
  const [period, setPeriod] = useState('month');
  const [categories, setCategories] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { start, end } = rangeForPeriod(period);
    const [cats, perf, inc, exp] = await Promise.all([
      spendingByCategory({ start, end }),
      monthlyPerformance(6),
      sumTransactions({ kind: 'income', start, end }),
      sumTransactions({ kind: 'expense', start, end }),
    ]);
    setCategories(cats.map((c) => ({ name: c.name, total: c.total, color: c.color })));
    setPerformance(perf.reverse());
    setTotals({ income: inc, expense: exp });
    setLoading(false);
  }, [period]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: period === p ? colors.primary : colors.border,
              backgroundColor: period === p ? colors.primary : colors.surface,
            }}
            onPress={() => setPeriod(p)}
          >
            <Text
              style={{
                color: period === p ? colors.textOnPrimary : colors.textSecondary,
                fontWeight: period === p ? '700' : '500',
              }}
            >
              {t(`analytics.${p}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm, fontSize: 13 }}>
        Amounts in {displayCurrency}
      </Text>

      <Button
        title="Generate report"
        onPress={() => router.push('/reports/generate')}
        style={{ marginBottom: spacing.md }}
      />

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {t('analytics.income')}
                </Text>
                <MoneyText cents={totals.income} variant="income" />
              </View>
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {t('analytics.expense')}
                </Text>
                <MoneyText cents={totals.expense} variant="expense" />
              </View>
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Net</Text>
                <MoneyText cents={totals.income - totals.expense} />
              </View>
            </View>
          </Card>
          <Text style={{ ...typography.subtitle, marginTop: spacing.lg, marginBottom: spacing.sm }}>
            {t('analytics.byCategory')}
          </Text>
          <Card>
            {categories.length ? (
              <BarChart data={categories} />
            ) : (
              <Text style={{ color: colors.textSecondary }}>{t('common.empty')}</Text>
            )}
          </Card>
          <Text style={{ ...typography.subtitle, marginTop: spacing.lg, marginBottom: spacing.sm }}>
            {t('analytics.performance')}
          </Text>
          {performance.map((m) => (
            <Card key={m.month_key} style={{ marginBottom: spacing.sm }}>
              <Text style={{ fontWeight: '700', marginBottom: spacing.xs, color: colors.text }}>
                {m.month_key}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ color: colors.textSecondary }}>{t('analytics.income')}: </Text>
                <MoneyText cents={m.income} variant="income" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ color: colors.textSecondary }}>{t('analytics.expense')}: </Text>
                <MoneyText cents={m.expense} variant="expense" />
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
