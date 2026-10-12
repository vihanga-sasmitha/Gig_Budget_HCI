/**
 * Production pinVault / routing regression tests with mocked SecureStore + crypto.
 * Run: node scripts/checkVaultScopedPin.js
 */
const assert = require('assert');
const crypto = require('crypto');
const Module = require('module');
const path = require('path');

const mem = new Map();
const mockStore = {
  getItemAsync: async (k) => (mem.has(k) ? mem.get(k) : null),
  setItemAsync: async (k, v) => {
    mem.set(k, String(v));
  },
  deleteItemAsync: async (k) => {
    mem.delete(k);
  },
};

const origRequire = Module.prototype.require;
Module.prototype.require = function mockRequire(request) {
  if (request === 'expo-secure-store') return mockStore;
  if (request === 'expo-crypto') {
    return {
      CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
      digestStringAsync: async (_algo, value) =>
        crypto.createHash('sha256').update(String(value)).digest('hex'),
      getRandomBytesAsync: async (n) => crypto.randomBytes(n),
    };
  }
  return origRequire.apply(this, arguments);
};

require('@babel/register')({
  extensions: ['.js'],
  presets: ['babel-preset-expo'],
  ignore: [/node_modules/],
  cache: false,
});

const pinVault = require(path.join(__dirname, '..', 'src', 'security', 'pinVault.js'));
const sessionStorage = require(path.join(__dirname, '..', 'src', 'api', 'sessionStorage.js'));

pinVault.__setSecureStoreForTests(mockStore);

const OFFLINE_PIN = '2580';
const CLOUD_PIN = '3691';
const WRONG_PIN = '1111';

function reset() {
  mem.clear();
  pinVault.__setSecureStoreForTests(mockStore);
}

async function seedLegacyOfflineGlobalPin() {
  // Simulate pre-fix global PIN belonging to Gig Worker offline profile.
  const salt = crypto.randomBytes(16).toString('hex');
  let value = `${salt}:${OFFLINE_PIN}`;
  for (let i = 0; i < 12000; i++) {
    value = crypto.createHash('sha256').update(value).digest('hex');
  }
  await mockStore.setItemAsync('gigbudget_pin_salt', salt);
  await mockStore.setItemAsync('gigbudget_pin_hash', value);
  await mockStore.setItemAsync('gigbudget_onboarded', '1');
  await mockStore.setItemAsync('gigbudget_vault_aes_key', 'aa'.repeat(32));
}

const cases = [];

function test(name, fn) {
  cases.push({ name, fn });
}

test('1. offline PIN does not imply cloud vault has PIN', async () => {
  reset();
  await pinVault.setupPin('offline', OFFLINE_PIN);
  await pinVault.completeOnboarding('offline');
  const offline = await pinVault.getSecuritySnapshot('offline');
  const cloud = await pinVault.getSecuritySnapshot('cloud_sasmitha');
  assert.strictEqual(offline.hasPin, true);
  assert.strictEqual(offline.securityComplete, true);
  assert.strictEqual(cloud.hasPin, false);
  assert.strictEqual(cloud.securityComplete, false);
  assert.strictEqual(cloud.nextStep, 'create_pin');
});

test('2. first Sasmitha login routes to Create PIN', async () => {
  reset();
  await pinVault.setupPin('offline', OFFLINE_PIN);
  await pinVault.completeOnboarding('offline');
  const security = await pinVault.getSecuritySnapshot('cloud_sasmitha');
  const href = pinVault.resolvePostVaultAuthRoute(security, { cloudSession: true });
  assert.strictEqual(href, '/create-pin');
  assert.notStrictEqual(href, '/initial-sync');
  assert.notStrictEqual(href, '/login');
});

test('3. creating cloud PIN does not change offline PIN', async () => {
  reset();
  await pinVault.setupPin('offline', OFFLINE_PIN);
  await pinVault.completeOnboarding('offline');
  await pinVault.setupPin('cloud_sasmitha', CLOUD_PIN);
  await pinVault.completeOnboarding('cloud_sasmitha');
  const offOk = await pinVault.verifyPin('offline', OFFLINE_PIN);
  const cloudOk = await pinVault.verifyPin('cloud_sasmitha', CLOUD_PIN);
  const offWrong = await pinVault.verifyPin('offline', CLOUD_PIN);
  const cloudWrong = await pinVault.verifyPin('cloud_sasmitha', OFFLINE_PIN);
  assert.strictEqual(offOk.ok, true);
  assert.strictEqual(cloudOk.ok, true);
  assert.strictEqual(offWrong.ok, false);
  assert.strictEqual(cloudWrong.ok, false);
});

test('4. distinct PINs unlock only their vaults', async () => {
  reset();
  await pinVault.setupPin('offline', OFFLINE_PIN);
  await pinVault.setupPin('cloud_sasmitha', CLOUD_PIN);
  assert.strictEqual((await pinVault.verifyPin('offline', OFFLINE_PIN)).ok, true);
  assert.strictEqual((await pinVault.verifyPin('cloud_sasmitha', CLOUD_PIN)).ok, true);
  assert.strictEqual((await pinVault.verifyPin('offline', WRONG_PIN)).ok, false);
  assert.strictEqual((await pinVault.verifyPin('cloud_sasmitha', WRONG_PIN)).ok, false);
});

test('5. lockout and biometrics are profile-specific', async () => {
  reset();
  await pinVault.setupPin('offline', OFFLINE_PIN);
  await pinVault.setupPin('cloud_sasmitha', CLOUD_PIN);
  await pinVault.setBiometricsEnabled('offline', true);
  assert.strictEqual(await pinVault.isBiometricsEnabled('offline'), true);
  assert.strictEqual(await pinVault.isBiometricsEnabled('cloud_sasmitha'), false);

  for (let i = 0; i < 5; i++) {
    await pinVault.verifyPin('cloud_sasmitha', WRONG_PIN);
  }
  const cloudLock = await pinVault.getLockoutState('cloud_sasmitha');
  const offlineLock = await pinVault.getLockoutState('offline');
  assert.strictEqual(cloudLock.locked, true);
  assert.strictEqual(offlineLock.locked, false);
  assert.strictEqual((await pinVault.verifyPin('offline', OFFLINE_PIN)).ok, true);
});

test('6. switching vaults requires fresh security snapshot (unlocked cleared by activate contract)', async () => {
  reset();
  await pinVault.setupPin('offline', OFFLINE_PIN);
  await pinVault.completeOnboarding('offline');
  const a = await pinVault.getSecuritySnapshot('offline');
  const b = await pinVault.getSecuritySnapshot('cloud_new');
  assert.strictEqual(a.securityComplete, true);
  assert.strictEqual(b.securityComplete, false);
  assert.strictEqual(b.nextStep, 'create_pin');
});

test('7. logout/restart stays on Welcome', async () => {
  const href = sessionStorage.resolveLaunchHref({
    ready: true,
    sessionMode: sessionStorage.SESSION_ACCOUNT_SELECTION,
    securityComplete: true,
    unlocked: false,
    activeVaultKey: null,
    onboardingStep: 'done',
    onboardingPath: null,
    hasPin: true,
  });
  assert.strictEqual(href, '/welcome');
});

test('8. resume offline preserves original PIN verification', async () => {
  reset();
  await pinVault.setupPin('legacy', OFFLINE_PIN);
  await pinVault.completeOnboarding('legacy');
  const snap = await pinVault.getSecuritySnapshot('legacy');
  assert.strictEqual(snap.securityComplete, true);
  assert.strictEqual(pinVault.resolvePostVaultAuthRoute(snap).startsWith('/login'), true);
  assert.strictEqual((await pinVault.verifyPin('legacy', OFFLINE_PIN)).ok, true);
});

test('9. migration assigns global PIN only to original offline vault', async () => {
  reset();
  await seedLegacyOfflineGlobalPin();
  const owners = {
    offline: { type: 'offline', id: 'offline' },
    cloud_sasmitha: { type: 'cloud', id: 'sasmitha' },
  };
  const result = await pinVault.migrateLegacyPinScopeIfNeeded({
    getVaultOwnersMap: async () => owners,
    getLastOfflineVaultKey: async () => 'offline',
  });
  assert.strictEqual(result.migrated, true);
  assert.strictEqual(result.target, 'offline');
  const offline = await pinVault.getSecuritySnapshot('offline');
  const cloud = await pinVault.getSecuritySnapshot('cloud_sasmitha');
  assert.strictEqual(offline.hasPin, true);
  assert.strictEqual(offline.securityComplete, true);
  assert.strictEqual(cloud.hasPin, false);
  assert.strictEqual((await pinVault.verifyPin('offline', OFFLINE_PIN)).ok, true);
  // Legacy keys retained
  assert.ok(await mockStore.getItemAsync('gigbudget_pin_salt'));
});

test('10. cloud vault from buggy flow still needs its own PIN setup', async () => {
  reset();
  await seedLegacyOfflineGlobalPin();
  await pinVault.migrateLegacyPinScopeIfNeeded({
    getVaultOwnersMap: async () => ({
      offline: { type: 'offline', id: 'offline' },
      cloud_sasmitha: { type: 'cloud', id: 'sas' },
    }),
    getLastOfflineVaultKey: async () => 'offline',
  });
  // Owner/DB exist for cloud but no vault-scoped PIN evidence
  const security = await pinVault.getSecuritySnapshot('cloud_sasmitha');
  assert.strictEqual(security.hasPin, false);
  assert.strictEqual(security.securityComplete, false);
  assert.strictEqual(
    pinVault.resolvePostVaultAuthRoute(security, { cloudSession: true }),
    '/create-pin'
  );
});

test('11. interrupted migration resumes without data loss', async () => {
  reset();
  await seedLegacyOfflineGlobalPin();
  const first = await pinVault.migrateLegacyPinScopeIfNeeded({
    getVaultOwnersMap: async () => ({ offline: { type: 'offline', id: 'offline' } }),
    getLastOfflineVaultKey: async () => 'offline',
  });
  const second = await pinVault.migrateLegacyPinScopeIfNeeded({
    getVaultOwnersMap: async () => ({ offline: { type: 'offline', id: 'offline' } }),
    getLastOfflineVaultKey: async () => 'offline',
  });
  assert.strictEqual(first.migrated, true);
  assert.strictEqual(second.alreadyDone, true);
  assert.strictEqual((await pinVault.verifyPin('offline', OFFLINE_PIN)).ok, true);
});

test('12. sync completion after setup does not require second unlock route', async () => {
  reset();
  await pinVault.setupPin('cloud_sasmitha', CLOUD_PIN);
  // Mid setup: has PIN, not yet complete — after bio/sync we complete and unlock in-session
  const mid = await pinVault.getSecuritySnapshot('cloud_sasmitha');
  assert.strictEqual(mid.hasPin, true);
  assert.strictEqual(mid.securityComplete, false);
  await pinVault.completeOnboarding('cloud_sasmitha');
  const done = await pinVault.getSecuritySnapshot('cloud_sasmitha');
  assert.strictEqual(done.securityComplete, true);
  // First-time setup path uses unlock()+tabs, not resolve to /login again
  assert.strictEqual(done.nextStep, 'unlock');
});

test('reject missing vault scope (no silent global fallback)', async () => {
  reset();
  let threw = false;
  try {
    await pinVault.hasPinConfigured(null);
  } catch (e) {
    threw = e.code === 'VAULT_SCOPE_REQUIRED';
  }
  assert.strictEqual(threw, true);
});

test('active incomplete cloud vault launch goes to create-pin', async () => {
  const href = sessionStorage.resolveLaunchHref({
    ready: true,
    sessionMode: 'active',
    securityComplete: false,
    unlocked: false,
    activeVaultKey: 'cloud_sasmitha',
    onboardingStep: 'welcome',
    onboardingPath: 'cloud',
    hasPin: false,
  });
  assert.strictEqual(href, '/create-pin');
});

(async () => {
  let failed = 0;
  for (const c of cases) {
    try {
      await c.fn();
      console.log(`OK  ${c.name}`);
    } catch (e) {
      failed += 1;
      console.error(`FAIL ${c.name}: ${e.message}`);
    }
  }
  pinVault.__resetSecureStoreForTests();
  if (failed) {
    console.error(`\n${failed} vault-scoped PIN check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${cases.length} vault-scoped PIN checks passed`);
})();
