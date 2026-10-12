import { useState } from 'react';
import { Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/theme';
import { SUPPORTED_CURRENCIES } from '../../src/currency/currencies';
import { describeRateBasis, isRateSnapshotStale } from '../../src/currency/rates';
import { formatMoney } from '../../src/currency/formatMoney';

export default function CurrencySettings() {
  const {
    displayCurrency,
    ledgerCurrency,
    setDisplayCurrency,
    fxSnapshot,
    refreshFxRates,
  } = useApp();
  const { colors, spacing, typography } = useTheme();
  const [busy, setBusy] = useState(false);
  const basis = describeRateBasis(fxSnapshot, ledgerCurrency, displayCurrency);

  const choose = async (code) => {
    if (busy) return;
    setBusy(true);
    try {
      await setDisplayCurrency(code);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
        Amounts are kept in {ledgerCurrency} (ledger). Changing display currency converts for viewing
        only — it does not rewrite your saved transactions.
      </Text>

      <Card style={{ marginBottom: spacing.md, gap: spacing.xs }}>
        <Text style={typography.subtitle}>Preview</Text>
        <Text style={{ color: colors.text }}>
          {formatMoney(100000, {
            ledgerCurrency,
            displayCurrency,
            snapshot: fxSnapshot,
          })}{' '}
          <Text style={{ color: colors.textSecondary }}>(example 1,000.00 {ledgerCurrency})</Text>
        </Text>
        {basis?.converted ? (
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Rate: {basis.direction}
            {'\n'}
            Source: {basis.source} · as of {new Date(basis.asOf).toLocaleString()}
            {basis.stale || basis.offlineFallback ? ' · cached / may be stale' : ''}
          </Text>
        ) : (
          <Text style={typography.caption}>Display matches ledger currency — no conversion.</Text>
        )}
        <Pressable
          onPress={async () => {
            setBusy(true);
            try {
              await refreshFxRates?.();
            } finally {
              setBusy(false);
            }
          }}
        >
          <Text style={{ color: colors.primaryDark, fontWeight: '700', marginTop: spacing.sm }}>
            Refresh rates
          </Text>
        </Pressable>
      </Card>

      {SUPPORTED_CURRENCIES.map((c) => {
        const active = displayCurrency === c.code;
        return (
          <Pressable key={c.code} onPress={() => choose(c.code)} disabled={busy}>
            <Card
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                marginBottom: spacing.sm,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primarySoft : colors.surface,
              }}
            >
              <View>
                <Text style={{ fontWeight: '800', color: colors.text, fontSize: 16 }}>{c.code}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{c.name}</Text>
              </View>
              <View style={{ flex: 1 }} />
              {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
