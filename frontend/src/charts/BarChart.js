import { View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../theme';
import { formatMoney } from '../currency/formatMoney';
import { useApp } from '../context/AppContext';
import { DEFAULT_LEDGER_CURRENCY } from '../currency/currencies';

export default function BarChart({ data, height = 160 }) {
  const { colors, spacing } = useTheme();
  const app = useApp();
  const moneyOpts = {
    ledgerCurrency: app?.ledgerCurrency || DEFAULT_LEDGER_CURRENCY,
    displayCurrency: app?.displayCurrency || DEFAULT_LEDGER_CURRENCY,
    snapshot: app?.fxSnapshot,
    compact: true,
  };
  const max = Math.max(...data.map((d) => d.total), 1);
  const barWidth = data.length ? Math.min(48, 280 / data.length) : 40;

  return (
    <View>
      <Svg
        height={height}
        width="100%"
        viewBox={`0 0 ${Math.max(data.length * (barWidth + 8), 100)} ${height}`}
      >
        {data.map((item, i) => {
          const h = (item.total / max) * (height - 24);
          const x = i * (barWidth + 8);
          const y = height - h - 4;
          return (
            <Rect
              key={item.name}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={4}
              fill={item.color || colors.chartTeal}
            />
          );
        })}
      </Svg>
      <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
        {data.slice(0, 5).map((item) => (
          <View
            key={item.name}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: item.color || colors.chartTeal,
              }}
            />
            <Text
              style={{ flex: 1, color: colors.textSecondary, fontSize: 13 }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>
              {formatMoney(item.total, moneyOpts)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
