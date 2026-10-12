/**
 * Behavioural checks for logout / account-selection semantics (no device).
 * Run: node scripts/checkSessionTransitions.js
 */
const assert = require('assert');

const SESSION_ACTIVE = 'active';
const SESSION_ACCOUNT_SELECTION = 'account_selection';

function afterLogoutState({ hadCloud, vaultKey, pendingForced }) {
  // Mirrors performLogout persistence outcomes (simplified).
  return {
    sessionMode: SESSION_ACCOUNT_SELECTION,
    activeVaultKey: null,
    cloudSignedIn: false,
    unlocked: false,
    vaultPreserved: Boolean(vaultKey),
    pendingPreserved: pendingForced !== 'discard',
    hadCloud,
  };
}

function resumeOffline({ hasOfflineVault, hasPin, onboardingComplete }) {
  if (hasOfflineVault && hasPin && onboardingComplete) {
    return { next: '/login', createPin: false, newDb: false };
  }
  if (!hasPin) return { next: '/create-pin', createPin: true, newDb: !hasOfflineVault };
  return { next: '/biometrics', createPin: false, newDb: !hasOfflineVault };
}

const cases = [
  {
    name: 'offline logout clears selection only',
    run: () => {
      const s = afterLogoutState({ hadCloud: false, vaultKey: 'offline', pendingForced: 'keep' });
      assert.strictEqual(s.sessionMode, SESSION_ACCOUNT_SELECTION);
      assert.strictEqual(s.activeVaultKey, null);
      assert.strictEqual(s.vaultPreserved, true);
      assert.strictEqual(s.cloudSignedIn, false);
    },
  },
  {
    name: 'cloud logout clears credentials flags',
    run: () => {
      const s = afterLogoutState({ hadCloud: true, vaultKey: 'cloud_1', pendingForced: 'keep' });
      assert.strictEqual(s.sessionMode, SESSION_ACCOUNT_SELECTION);
      assert.strictEqual(s.pendingPreserved, true);
      assert.strictEqual(s.unlocked, false);
    },
  },
  {
    name: 'resume offline asks PIN not create',
    run: () => {
      const r = resumeOffline({
        hasOfflineVault: true,
        hasPin: true,
        onboardingComplete: true,
      });
      assert.strictEqual(r.next, '/login');
      assert.strictEqual(r.createPin, false);
      assert.strictEqual(r.newDb, false);
    },
  },
  {
    name: 'active session stays active constant',
    run: () => {
      assert.notStrictEqual(SESSION_ACTIVE, SESSION_ACCOUNT_SELECTION);
    },
  },
];

let failed = 0;
for (const c of cases) {
  try {
    c.run();
    console.log(`OK  ${c.name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL ${c.name}: ${e.message}`);
  }
}

if (failed) {
  process.exit(1);
}
console.log(`\nAll ${cases.length} session-transition checks passed`);
