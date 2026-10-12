import Svg, { Circle, Rect, Path, Ellipse } from 'react-native-svg';
import { useTheme } from '../theme';

/**
 * Lightweight original SVG empty-state illustrations (repo-native).
 * Licence: original GigBudget artwork — MIT with the application source.
 */
export default function EmptyIllustration({ kind = 'transactions', size = 120 }) {
  const { colors } = useTheme();
  const accent = colors.primary;
  const soft = colors.primarySoft;
  const muted = colors.border;

  if (kind === 'savings') {
    return (
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx="60" cy="60" r="52" fill={soft} />
        <Ellipse cx="60" cy="62" rx="34" ry="28" fill={accent} opacity={0.9} />
        <Circle cx="78" cy="54" r="6" fill={colors.surface} />
        <Rect x="52" y="36" width="16" height="10" rx="3" fill={colors.primaryDark} />
        <Path d="M40 88h40" stroke={muted} strokeWidth="4" strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === 'reminders') {
    return (
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx="60" cy="60" r="52" fill={soft} />
        <Rect x="38" y="34" width="44" height="48" rx="8" fill={accent} />
        <Rect x="46" y="44" width="28" height="6" rx="2" fill={colors.surface} />
        <Rect x="46" y="56" width="20" height="6" rx="2" fill={colors.mint} />
        <Circle cx="78" cy="34" r="10" fill={colors.danger} />
      </Svg>
    );
  }

  // transactions default
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx="60" cy="60" r="52" fill={soft} />
      <Rect x="32" y="38" width="56" height="44" rx="8" fill={colors.surface} stroke={accent} strokeWidth="3" />
      <Path d="M42 52h36M42 64h24" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      <Circle cx="78" cy="78" r="14" fill={accent} />
      <Path d="M78 72v12M72 78h12" stroke={colors.textOnPrimary} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}
