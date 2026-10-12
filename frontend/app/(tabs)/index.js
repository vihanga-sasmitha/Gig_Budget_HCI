import { useCallback, useEffect, useState } from 'react';
import { Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import MoneyText from '../../src/components/MoneyText';
import EmptyState from '../../src/components/EmptyState';
import { useApp } from '../../src/context/AppContext';
import {
  listTransactions,
  sumTransactions,
  listSavingsGoals,
  listBills,
} from '../../src/db/database';
import { colomboDateKey, formatDisplayDate } from '../../src/utils/dateColombo';
import { useTheme } from '../../src/theme';

export default function Dashboard() {
  const router = useRouter();
  const { profile, refreshToken, refresh, online, t, displayCurrency } = useApp();
  const { colors, spacing, typography, radii } = useTheme();
  const [loading, setLoading] = useState(true);
  const [todayIncome, setTodayIncome] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);
  const [recent, setRecent] = useState([]);
  const [goals, setGoals] = useState([]);
  const [bills, setBills] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const today = colomboDateKey();
    const [inc, exp, tx, g, b] = await Promise.all([
      sumTransactions({ kind: 'income', start: today, end: today }),
      sumTransactions({ kind: 'expense', start: today, end: today }),
      listTransactions({ limit: 8 }),
      listSavingsGoals(),
      listBills(),
    ]);
    setTodayIncome(inc);
    setTodayExpense(exp);
    setRecent(tx);
    setGoals(g.slice(0, 3));
    setBills(b.filter((x) => !x.paid).slice(0, 3));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const net = todayIncome - todayExpense;
  const name = profile?.name || t('settings.defaultName');

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      refreshing={loading}
      onRefresh={() => {
        refresh();
        load();
      }}
    >
      {!online ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: spacing.sm,
          }}
        >
          <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
          <Text style={{ color: colors.warning, fontSize: 13 }}>{t('common.offline')}</Text>
        </View>
      ) : null}

      <Card
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Welcome back</Text>
          <Text style={{ ...typography.title, marginBottom: 0 }}>{name}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
            Showing amounts in {displayCurrency}
          </Text>
        </View>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.primaryDark, fontWeight: '800' }}>
            {name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
      </Card>

      <Pressable onPress={() => router.push('/(tabs)/analytics')}>
        <Card
          style={{
            marginBottom: spacing.md,
            backgroundColor: colors.primary,
            borderColor: colors.primaryDark,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.9)', marginBottom: spacing.xs }}>
            {t('dashboard.netProfit')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <MoneyText cents={net} style={{ fontSize: 28, color: '#fff' }} />
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </View>
        </Card>
      </Pressable>

      <View style={{ flexDirection: 'row', marginBottom: spacing.md, gap: spacing.sm }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>
            {t('dashboard.todayIncome')}
          </Text>
          <MoneyText cents={todayIncome} variant="income" />
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>
            {t('dashboard.todayExpense')}
          </Text>
          <MoneyText cents={todayExpense} variant="expense" />
        </Card>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Pressable
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.surface,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.md,
          }}
          onPress={() => router.push('/expense/quick')}
        >
          <Ionicons name="remove-circle-outline" size={22} color={colors.danger} />
          <Text style={{ color: colors.text, flex: 1 }}>{t('dashboard.addExpense')}</Text>
        </Pressable>
        <Pressable
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.surface,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.md,
          }}
          onPress={() => router.push('/income/new')}
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.success} />
          <Text style={{ color: colors.text, flex: 1 }}>{t('dashboard.addIncome')}</Text>
        </Pressable>
      </View>

      <Button
        title="Generate report"
        variant="secondary"
        onPress={() => router.push('/reports/generate')}
        style={{ marginBottom: spacing.lg }}
      />

      <Text style={typography.subtitle}>{t('dashboard.recent')}</Text>
      {recent.length === 0 ? (
        <EmptyState message={t('common.empty')} illustration="transactions" />
      ) : (
        recent.map((item) => (
          <Pressable
            key={item.id}
            onPress={() =>
              router.push(item.kind === 'income' ? `/income/${item.id}` : `/expense/${item.id}`)
            }
          >
            <Card style={{ marginBottom: spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text style={{ fontWeight: '600', color: colors.text }}>
                    {item.category_name || item.kind}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    {formatDisplayDate(item.date_key)}
                  </Text>
                </View>
                <MoneyText
                  cents={item.kind === 'expense' ? -item.amount_cents : item.amount_cents}
                  variant={item.kind === 'income' ? 'income' : 'expense'}
                />
              </View>
            </Card>
          </Pressable>
        ))
      )}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: spacing.md,
          marginBottom: spacing.sm,
        }}
      >
        <Text style={typography.subtitle}>{t('dashboard.savings')}</Text>
        <Pressable onPress={() => router.push('/savings')}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>See all</Text>
        </Pressable>
      </View>
      {goals.length === 0 ? (
        <EmptyState icon="flag-outline" message={t('common.empty')} illustration="savings" />
      ) : (
        goals.map((g) => (
          <Pressable key={g.id} onPress={() => router.push(`/savings/${g.id}`)}>
            <Card style={{ marginBottom: spacing.sm }}>
              <Text style={{ fontWeight: '600', color: colors.text }}>{g.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <MoneyText cents={g.current_cents} />
                <Text style={{ color: colors.textSecondary }}> / </Text>
                <MoneyText cents={g.target_cents} />
              </View>
            </Card>
          </Pressable>
        ))
      )}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: spacing.md,
          marginBottom: spacing.sm,
        }}
      >
        <Text style={typography.subtitle}>{t('dashboard.bills')}</Text>
        <Pressable onPress={() => router.push('/bills')}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>See all</Text>
        </Pressable>
      </View>
      {bills.length === 0 ? (
        <EmptyState icon="calendar-outline" message={t('common.empty')} illustration="reminders" />
      ) : (
        bills.map((b) => (
          <Pressable key={b.id} onPress={() => router.push(`/bills/${b.id}`)}>
            <Card style={{ marginBottom: spacing.sm }}>
              <Text style={{ fontWeight: '600', color: colors.text }}>{b.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                Due {formatDisplayDate(b.due_key)}
              </Text>
              <MoneyText cents={b.amount_cents} variant="expense" />
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
