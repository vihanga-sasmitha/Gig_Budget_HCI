/**
 * Lightweight launch-route + session-mode checks (no Expo runtime).
 * Mirrors frontend/src/api/sessionStorage.js resolveLaunchHref.
 * Run: node scripts/checkLaunchRoutes.js
 */
const assert = require('assert');

const SESSION_ACCOUNT_SELECTION = 'account_selection';

function resolveLaunchHref({
  ready,
  sessionMode,
  securityComplete,
  unlocked,
  activeVaultKey,
  onboardingStep,
  onboardingPath,
  hasPin,
}) {
  if (!ready) return null;

  if (sessionMode === SESSION_ACCOUNT_SELECTION || (!activeVaultKey && securityComplete)) {
    return '/welcome';
  }

  if (activeVaultKey && sessionMode !== SESSION_ACCOUNT_SELECTION && !securityComplete) {
    if (hasPin && onboardingStep === 'initial_sync') return '/initial-sync';
    if (hasPin) return '/biometrics';
    if (onboardingStep === 'sign_in') return '/sign-in';
    if (onboardingStep === 'register') return '/register';
    return '/create-pin';
  }

  if (securityComplete && activeVaultKey && sessionMode !== SESSION_ACCOUNT_SELECTION) {
    if (!unlocked) return '/login';
    return '/(tabs)';
  }

  if (hasPin && onboardingPath === 'cloud' && onboardingStep === 'initial_sync') {
    return '/initial-sync';
  }
  if (hasPin && (onboardingStep === 'biometrics' || onboardingStep === 'confirm_pin')) {
    return '/biometrics';
  }
  if (onboardingStep === 'create_pin' || onboardingStep === 'confirm_pin') {
    return '/create-pin';
  }
  if (onboardingStep === 'offline_profile') return '/offline-profile';
  if (onboardingStep === 'sign_in') return '/sign-in';
  if (onboardingStep === 'register') return '/register';
  if (onboardingStep === 'initial_sync') return '/initial-sync';
  return '/welcome';
}

const cases = [
  {
    name: 'wait for hydration',
    input: {
      ready: false,
      sessionMode: null,
      securityComplete: true,
      unlocked: false,
      activeVaultKey: 'legacy',
      onboardingStep: 'done',
      onboardingPath: null,
      hasPin: true,
    },
    expect: null,
  },
  {
    name: 'fresh launch',
    input: {
      ready: true,
      sessionMode: null,
      securityComplete: false,
      unlocked: false,
      activeVaultKey: null,
      onboardingStep: 'welcome',
      onboardingPath: null,
      hasPin: false,
    },
    expect: '/welcome',
  },
  {
    name: 'returning locked',
    input: {
      ready: true,
      sessionMode: 'active',
      securityComplete: true,
      unlocked: false,
      activeVaultKey: 'legacy',
      onboardingStep: 'done',
      onboardingPath: null,
      hasPin: true,
    },
    expect: '/login',
  },
  {
    name: 'returning unlocked',
    input: {
      ready: true,
      sessionMode: 'active',
      securityComplete: true,
      unlocked: true,
      activeVaultKey: 'legacy',
      onboardingStep: 'done',
      onboardingPath: null,
      hasPin: true,
    },
    expect: '/(tabs)',
  },
  {
    name: 'explicit logout survives restart',
    input: {
      ready: true,
      sessionMode: SESSION_ACCOUNT_SELECTION,
      securityComplete: true,
      unlocked: false,
      activeVaultKey: null,
      onboardingStep: 'welcome',
      onboardingPath: null,
      hasPin: true,
    },
    expect: '/welcome',
  },
  {
    name: 'logout wins over stale vault key',
    input: {
      ready: true,
      sessionMode: SESSION_ACCOUNT_SELECTION,
      securityComplete: true,
      unlocked: false,
      activeVaultKey: 'legacy',
      onboardingStep: 'done',
      onboardingPath: null,
      hasPin: true,
    },
    expect: '/welcome',
  },
  {
    name: 'buggy cloud vault without PIN → create-pin',
    input: {
      ready: true,
      sessionMode: 'active',
      securityComplete: false,
      unlocked: false,
      activeVaultKey: 'cloud_sasmitha',
      onboardingStep: 'welcome',
      onboardingPath: 'cloud',
      hasPin: false,
    },
    expect: '/create-pin',
  },
  {
    name: 'resume cloud sync after vault PIN',
    input: {
      ready: true,
      sessionMode: 'active',
      securityComplete: false,
      unlocked: false,
      activeVaultKey: 'cloud_x',
      onboardingStep: 'initial_sync',
      onboardingPath: 'cloud',
      hasPin: true,
    },
    expect: '/initial-sync',
  },
];

let failed = 0;
for (const c of cases) {
  const got = resolveLaunchHref(c.input);
  try {
    assert.strictEqual(got, c.expect);
    console.log(`OK  ${c.name} → ${got}`);
  } catch {
    failed += 1;
    console.error(`FAIL ${c.name}: expected ${c.expect}, got ${got}`);
  }
}

if (failed) {
  console.error(`\n${failed} launch-route check(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} launch-route checks passed`);
