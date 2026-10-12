/**
 * GigBudget semantic design tokens — light / dark.
 * Teal brand preserved (#169E98 / #117C78).
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const lightColors = {
  mode: 'light',
  primary: '#169E98',
  primaryDark: '#117C78',
  primarySoft: '#E6F6F5',
  mint: '#B8E8DE',
  background: '#F4F8F7',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF4F3',
  border: '#C5DDD9',
  text: '#172321',
  textSecondary: '#5F6F6B',
  textOnPrimary: '#FFFFFF',
  success: '#159B75',
  danger: '#D95360',
  warning: '#E1A32B',
  chartTeal: '#169E98',
  chartAmber: '#E1A32B',
  chartViolet: '#7B61FF',
  overlay: 'rgba(23, 35, 33, 0.45)',
  badgeBg: '#E8F7F1',
  badgeText: '#0F7A5A',
  keypad: '#F3F7F6',
  tabInactive: '#8A9894',
  inputBg: '#FFFFFF',
  shadow: 'rgba(17, 124, 120, 0.12)',
};

export const darkColors = {
  mode: 'dark',
  primary: '#2BB8B1',
  primaryDark: '#1A9E97',
  primarySoft: '#143836',
  mint: '#1F4A45',
  background: '#0E1615',
  surface: '#1A2423',
  surfaceMuted: '#24302E',
  border: '#2F403D',
  text: '#F2F7F6',
  textSecondary: '#A3B3AF',
  textOnPrimary: '#06201E',
  success: '#3DCF9A',
  danger: '#F0717A',
  warning: '#E8B84A',
  chartTeal: '#2BB8B1',
  chartAmber: '#E8B84A',
  chartViolet: '#9B8CFF',
  overlay: 'rgba(0, 0, 0, 0.55)',
  badgeBg: '#1A3D34',
  badgeText: '#7EE0BC',
  keypad: '#222E2C',
  tabInactive: '#7A8A86',
  inputBg: '#1A2423',
  shadow: 'rgba(0, 0, 0, 0.35)',
};

export function makeTypography(colors) {
  return {
    title: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    subtitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    body: { fontSize: 15, fontWeight: '400', color: colors.text, lineHeight: 22 },
    caption: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, lineHeight: 18 },
    brand: { fontSize: 28, fontWeight: '800', color: colors.primary, letterSpacing: -0.4 },
  };
}
