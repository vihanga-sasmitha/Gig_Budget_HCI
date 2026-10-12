import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useApp } from '../context/AppContext';
import { SESSION_ACCOUNT_SELECTION } from '../api/sessionStorage';

const AUTH_SEGMENTS = new Set([
  'welcome',
  'sign-in',
  'register',
  'forgot-password',
  'offline-profile',
  'create-pin',
  'confirm-pin',
  'biometrics',
  'initial-sync',
  'login',
]);

const SETUP_SEGMENTS = new Set([
  'create-pin',
  'confirm-pin',
  'biometrics',
  'initial-sync',
  'sign-in',
  'register',
  'offline-profile',
  'forgot-password',
  'welcome',
]);

const PROTECTED_ROOTS = new Set([
  '(tabs)',
  'expense',
  'income',
  'savings',
  'bills',
  'notifications',
  'settings',
]);

/**
 * Blocks financial routes when the local vault is locked or logged out.
 * Cloud auth alone never grants access. Incomplete vault-scoped setup may use auth screens.
 */
export default function RouteGuard({ children }) {
  const {
    ready,
    unlocked,
    onboardingComplete,
    activeVaultKey,
    sessionMode,
    hasPin,
  } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const root = segments[0];
    const leaf = segments[1];
    const inAuthGroup = root === '(auth)' || AUTH_SEGMENTS.has(root);
    const authLeaf = root === '(auth)' ? leaf : root;
    const onSetupScreen = SETUP_SEGMENTS.has(authLeaf);
    const protectedRoute = PROTECTED_ROOTS.has(root);

    if (sessionMode === SESSION_ACCOUNT_SELECTION) {
      if (protectedRoute || authLeaf === 'login') {
        router.replace('/welcome');
      }
      return;
    }

    if (!protectedRoute) return;

    if (!activeVaultKey) {
      router.replace('/welcome');
      return;
    }

    // Active vault without completed vault-scoped security → setup, not financial screens.
    if (!onboardingComplete) {
      if (!onSetupScreen) {
        router.replace(hasPin ? '/biometrics' : '/create-pin');
      }
      return;
    }

    if (!unlocked) {
      if (authLeaf !== 'login' && root !== 'login') router.replace('/login');
    }
  }, [
    ready,
    segments,
    unlocked,
    onboardingComplete,
    activeVaultKey,
    sessionMode,
    hasPin,
    router,
  ]);

  return children;
}
