import { useState } from 'react';
import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import { useApp } from '../../src/context/AppContext';
import { colors, spacing, typography } from '../../src/theme';

export default function SyncSettings() {
  const { syncNow, syncMeta, outboxCount, online, t, syncPausedReason, cloudSignedIn } = useApp();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  const run = async () => {
    setBusy(true);
    const res = await syncNow();
    setResult(res.ok ? 'Sync complete' : res.reason || res.error || t('common.error'));
    setBusy(false);
  };

  return (
    <Screen scroll>
      {!online ? <Text style={styles.offline}>{t('common.offline')}</Text> : null}
      {!cloudSignedIn ? (
        <Text style={styles.offline}>{t('settings.syncPaused')}</Text>
      ) : null}
      {syncPausedReason ? <Text style={styles.error}>{t('settings.syncPaused')}</Text> : null}
      <Text style={styles.line}>
        {t('settings.lastSync')}: {syncMeta?.last_push_at || '—'}
      </Text>
      <Text style={styles.line}>
        {t('settings.pending')}: {outboxCount}
      </Text>
      {syncMeta?.last_error ? (
        <Text style={styles.error}>{syncMeta.last_error}</Text>
      ) : null}
      {busy ? <ActivityIndicator color={colors.primary} /> : null}
      <Button title={t('settings.syncNow')} onPress={run} />
      {result ? <Text style={styles.result}>{result}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { ...typography.body, marginBottom: spacing.sm },
  offline: { color: colors.warning, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  result: { marginTop: spacing.md, color: colors.primaryDark },
});
