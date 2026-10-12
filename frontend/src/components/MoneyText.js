import { Text } from 'react-native';
import { useTheme } from '../theme';
import { useApp } from '../context/AppContext';
import { formatMoney } from '../currency/formatMoney';
import { DEFAULT_LEDGER_CURRENCY } from '../currency/currencies';

export default function MoneyText({
  cents,
  style,
  variant = 'default',
  showSymbol = true,
  compact = false,
}) {
  const { colors } = useTheme();
  const app = useAppSafe();
  const color =
    variant === 'income'
      ? colors.success
      : variant === 'expense'
        ? colors.danger
        : colors.text;

  const text = formatMoney(cents, {
    ledgerCurrency: app?.ledgerCurrency || DEFAULT_LEDGER_CURRENCY,
    displayCurrency: app?.displayCurrency || DEFAULT_LEDGER_CURRENCY,
    snapshot: app?.fxSnapshot,
    showSymbol,
    compact,
  });

  return <Text style={[{ fontWeight: '700', fontSize: 18, color }, style]}>{text}</Text>;
}

function useAppSafe() {
  try {
    return useApp();
  } catch {
    return null;
  }
}
