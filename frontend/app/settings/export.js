import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import { exportTransactionsCsv } from '../../src/db/database';
import { useApp } from '../../src/context/AppContext';
import { colors, spacing } from '../../src/theme';

export default function ExportSettings() {
  const { t } = useApp();
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);

  const exportCsv = async () => {
    setStatus('');
    setFailed(false);
    try {
      const csv = await exportTransactionsCsv();
      const file = new File(Paths.cache, 'gigbudget-export.csv');
      file.create({ overwrite: true });
      file.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export transactions CSV',
        });
      }
      setStatus('Export ready');
    } catch (e) {
      setFailed(true);
      setStatus(e.message || t('common.error'));
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.body}>{t('settings.export')}</Text>
      <Button title="Export transactions CSV" onPress={exportCsv} />
      {status ? (
        <Text style={[styles.status, failed && styles.statusError]}>{status}</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { marginBottom: spacing.lg, color: colors.textSecondary },
  status: { marginTop: spacing.md, color: colors.success },
  statusError: { color: colors.danger },
});
