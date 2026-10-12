import Svg, { Circle, Path, Rect, G } from 'react-native-svg';
import { useTheme } from '../theme';

/** Original vector illustration — gig finance wallet + chart (MIT-style original for this repo). */
export default function WelcomeHero({ size = 120 }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx="60" cy="60" r="56" fill={colors.primarySoft} />
      <Rect x="28" y="38" width="64" height="44" rx="12" fill={colors.primary} />
      <Rect x="28" y="38" width="64" height="14" rx="8" fill={colors.primaryDark} />
      <Circle cx="78" cy="60" r="8" fill={colors.mint} />
      <G stroke={colors.textOnPrimary} strokeWidth="3" fill="none" strokeLinecap="round">
        <Path d="M40 72 L50 62 L58 68 L72 52" />
      </G>
      <Circle cx="92" cy="88" r="14" fill={colors.success} />
      <Path d="M86 88 L90 92 L100 82" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    </Svg>
  );
}
