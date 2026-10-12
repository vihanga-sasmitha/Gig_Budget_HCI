import { ThemeProvider } from './ThemeContext';
import { useApp } from '../context/AppContext';

/** Connects vault-scoped appearance preference into ThemeProvider. */
export default function ThemeBridge({ children }) {
  const { vaultAppearanceMode } = useApp();
  return <ThemeProvider vaultAppearanceMode={vaultAppearanceMode}>{children}</ThemeProvider>;
}
