import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../theme';
import { formatMoney } from '../currency/formatMoney';
import { useApp } from '../context/AppContext';
import { DEFAULT_LEDGER_CURRENCY } from '../currency/currencies';

export default function DonutChart({ segments, size = 180, centerLabel }) {
  const { colors, spacing } = useTheme();
  const app = useApp();
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const moneyOpts = {
    ledgerCurrency: app?.ledgerCurrency || DEFAULT_LEDGER_CURRENCY,
    displayCurrency: app?.displayCurrency || DEFAULT_LEDGER_CURRENCY,
    snapshot: app?.fxSnapshot,
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <G rotation="-90" origin={`${cx}, ${cy}`}>
          {segments.map((seg) => {
            const frac = seg.value / total;
            const dash = circumference * frac;
            const el = (
              <Circle
                key={seg.label}
                cx={cx}
                cy={cy}
                r={r}
                stroke={seg.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return el;
          })}
        </G>
      </Svg>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16, textAlign: 'center' }}>
          {centerLabel || formatMoney(total, moneyOpts)}
        </Text>
      </View>
      <View style={{ width: '100%', marginTop: spacing.md, gap: spacing.xs }}>
        {segments.map((seg) => (
          <View
            key={seg.label}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <View
              style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: seg.color }}
            />
            <Text style={{ flex: 1, color: colors.textSecondary }}>{seg.label}</Text>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              {Math.round((seg.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
