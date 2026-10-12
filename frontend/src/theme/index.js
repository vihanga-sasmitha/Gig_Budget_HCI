/**
 * Backward-compatible theme exports.
 * Prefer useTheme() for dynamic light/dark colors.
 */
export { lightColors as colors, spacing, radii, makeTypography } from './tokens';
export { ThemeProvider, useTheme, getStoredAppearanceMode, setStoredAppearanceMode } from './ThemeContext';

import { lightColors, makeTypography, spacing, radii } from './tokens';

export const typography = makeTypography(lightColors);

export default {
  colors: lightColors,
  spacing,
  radii,
  typography,
};
