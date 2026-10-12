import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { darkColors, lightColors, makeTypography, radii, spacing } from './tokens';

const ThemeContext = createContext(null);

const APPEARANCE_KEY = 'gigbudget_appearance_mode';

/** Device-level appearance (Welcome/auth after logout). Vault prefs can override when active. */
export async function getStoredAppearanceMode() {
  return (await SecureStore.getItemAsync(APPEARANCE_KEY)) || 'system';
}

export async function setStoredAppearanceMode(mode) {
  const next = ['light', 'dark', 'system'].includes(mode) ? mode : 'system';
  await SecureStore.setItemAsync(APPEARANCE_KEY, next);
  return next;
}

export function ThemeProvider({ children, vaultAppearanceMode = null }) {
  const systemScheme = useColorScheme();
  const [deviceMode, setDeviceMode] = useState('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredAppearanceMode();
      if (!cancelled) {
        setDeviceMode(stored);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      // useColorScheme updates; force re-render via state touch when system chosen
      setDeviceMode((m) => m);
    });
    return () => sub.remove();
  }, []);

  const preference =
    vaultAppearanceMode && ['light', 'dark', 'system'].includes(vaultAppearanceMode)
      ? vaultAppearanceMode
      : deviceMode;

  const resolved =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const colors = resolved === 'dark' ? darkColors : lightColors;
  const typography = useMemo(() => makeTypography(colors), [colors]);

  const setAppearanceMode = useCallback(async (mode) => {
    const next = await setStoredAppearanceMode(mode);
    setDeviceMode(next);
    return next;
  }, []);

  const value = useMemo(
    () => ({
      ready,
      appearanceMode: preference,
      resolvedScheme: resolved,
      colors,
      typography,
      spacing,
      radii,
      setAppearanceMode,
      isDark: resolved === 'dark',
    }),
    [ready, preference, resolved, colors, typography, setAppearanceMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for modules imported before provider (tests / edge)
    const colors = lightColors;
    return {
      ready: true,
      appearanceMode: 'light',
      resolvedScheme: 'light',
      colors,
      typography: makeTypography(colors),
      spacing,
      radii,
      setAppearanceMode: async () => 'light',
      isDark: false,
    };
  }
  return ctx;
}
