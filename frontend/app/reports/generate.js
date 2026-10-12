import { useState } from 'react';
import { Text, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import DateField from '../../src/components/DateField';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/theme';
import {
  buildReportData,
  reportToCsv,
  reportToHtml,
} from '../../src/reports/buildReportData';
import {
  generateAndSharePdf,
  printOrSharePdf,
} from '../../src/reports/shareReportFile';

const PRESETS = [
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
  { id: 'custom', label: 'Custom' },
];

function isUserCancel(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return msg.includes('cancel') || msg.includes('dismiss') || msg.includes('user did not');
}

export default function GenerateReport() {
  const {
    profile,
    ledgerCurrency,
    displayCurrency,
    fxSnapshot,
    t,
  } = useApp();
  const { colors, spacing, typography } = useTheme();
  const [preset, setPreset] = useState('month');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyMode, setBusyMode] = useState(null);
  const [status, setStatus] = useState('');
  const [lastSummary, setLastSummary] = useState(null);

  const run = async (mode) => {
    if (busy) return;
    if (preset === 'custom' && (!start || !end)) {
      setStatus('Select a start and end date for a custom range.');
      return;
    }
    if (preset === 'custom' && start > end) {
      setStatus('Start date must be on or before end date.');
      return;
    }
    setBusy(true);
    setBusyMode(mode);
    setStatus('');
    try {
      const report = await buildReportData({
        preset,
        customStart: start,
        customEnd: end,
        profileName: profile?.name,
        ledgerCurrency,
        displayCurrency,
        fxSnapshot,
      });
      setLastSummary({
        label: report.range.label,
        income: report.totals.income,
        expense: report.totals.expense,
        profit: report.totals.profit,
        count: report.transactions.length,
      });

      if (mode === 'pdf') {
        const result = await generateAndSharePdf(reportToHtml(report));
        setStatus(
          result.shared
            ? `PDF ready (${report.transactions.length} transactions). Use the share sheet to open or save it.`
            : `PDF saved on device (${report.transactions.length} transactions). Sharing is unavailable on this device.`
        );
      } else if (mode === 'csv') {
        const csv = reportToCsv(report);
        const file = new File(Paths.cache, `gigbudget-report-${Date.now()}.csv`);
        if (file.exists) file.delete();
        file.create({ overwrite: true });
        file.write(csv);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'text/csv',
            dialogTitle: 'GigBudget report CSV',
          });
        }
        setStatus(`CSV ready (${report.transactions.length} transactions).`);
      } else {
        const result = await printOrSharePdf(reportToHtml(report));
        if (result.mode === 'share-fallback') {
          setStatus(
            'Print preview was unavailable, so the PDF share sheet was opened instead.'
          );
        } else {
          setStatus('Opened system print preview.');
        }
      }
    } catch (e) {
      if (isUserCancel(e)) {
        setStatus('Cancelled.');
      } else {
        const msg = e.message || t('common.error');
        setStatus(msg);
        Alert.alert('Report failed', msg);
      }
    } finally {
      setBusy(false);
      setBusyMode(null);
    }
  };

  return (
    <Screen scroll>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
        Build a PDF or CSV from this device’s local records (Asia/Colombo dates). Display currency:{' '}
        {displayCurrency}.
      </Text>

      <Text style={typography.subtitle}>Period</Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginVertical: spacing.sm,
        }}
      >
        {PRESETS.map((p) => {
          const active = preset === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => !busy && setPreset(p.id)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: 999,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  color: active ? colors.textOnPrimary : colors.text,
                  fontWeight: '700',
                }}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {preset === 'custom' ? (
        <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          <DateField label="Start" value={start} onChange={setStart} placeholder="Select start" />
          <DateField label="End" value={end} onChange={setEnd} placeholder="Select end" />
        </Card>
      ) : null}

      {busy ? (
        <View style={{ alignItems: 'center', marginVertical: spacing.md, gap: spacing.sm }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {busyMode === 'pdf'
              ? 'Building PDF…'
              : busyMode === 'csv'
                ? 'Building CSV…'
                : 'Opening print preview…'}
          </Text>
        </View>
      ) : null}

      <Button
        title="Generate & share PDF"
        onPress={() => run('pdf')}
        loading={busy && busyMode === 'pdf'}
        disabled={busy}
      />
      <View style={{ height: spacing.sm }} />
      <Button
        title="Export CSV"
        variant="secondary"
        onPress={() => run('csv')}
        loading={busy && busyMode === 'csv'}
        disabled={busy}
      />
      <View style={{ height: spacing.sm }} />
      <Button
        title="Print preview"
        variant="ghost"
        onPress={() => run('print')}
        loading={busy && busyMode === 'print'}
        disabled={busy}
      />

      {lastSummary ? (
        <Card style={{ marginTop: spacing.lg, gap: spacing.xs }}>
          <Text style={typography.subtitle}>Last run</Text>
          <Text style={{ color: colors.textSecondary }}>{lastSummary.label}</Text>
          <Text style={{ color: colors.text }}>Income: {lastSummary.income}</Text>
          <Text style={{ color: colors.text }}>Expenses: {lastSummary.expense}</Text>
          <Text style={{ color: colors.text }}>Net: {lastSummary.profit}</Text>
          <Text style={{ color: colors.textSecondary }}>
            {lastSummary.count} transactions
          </Text>
        </Card>
      ) : null}
      {status ? (
        <Text
          style={{
            marginTop: spacing.md,
            color: status.toLowerCase().includes('fail') || status.toLowerCase().includes('not allowed')
              ? colors.danger
              : colors.primaryDark,
            fontWeight: '600',
          }}
        >
          {status}
        </Text>
      ) : null}
    </Screen>
  );
}
