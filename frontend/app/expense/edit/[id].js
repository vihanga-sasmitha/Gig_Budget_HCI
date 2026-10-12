import { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Screen from '../../../src/components/Screen';
import Button from '../../../src/components/Button';
import SelectField from '../../../src/components/SelectField';
import {
  getTransaction,
  updateTransaction,
  listCategories,
  resolveCategoryId,
} from '../../../src/db/database';
import { parseMoneyInputToCents, formatLKR } from '../../../src/utils/money';
import { useApp } from '../../../src/context/AppContext';
import { colors, spacing, typography } from '../../../src/theme';

export default function EditExpense() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { refresh, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [note, setNote] = useState('');
  const [existing, setExisting] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [row, cats] = await Promise.all([getTransaction(id), listCategories('expense')]);
        if (cancelled) return;
        setCategories(cats);
        if (row) {
          setExisting(row);
          setAmountStr((row.amount_cents / 100).toFixed(2));
          const resolved = await resolveCategoryId(row.category_id, 'expense');
          if (cancelled) return;
          setCategoryId(resolved || row.category_id);
          setNote(row.note || '');
        }
      } catch (e) {
        if (!cancelled) setError(e.message || t('common.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const save = async () => {
    if (!existing || saving) return;
    const cents = parseMoneyInputToCents(amountStr);
    if (!cents || cents <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!categoryId) {
      setError('Select a category');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateTransaction(id, {
        kind: 'expense',
        amount_cents: cents,
        category_id: categoryId,
        note,
        date_key: existing.date_key,
        platform: existing.platform,
      });
      await refresh();
      router.back();
    } catch (e) {
      setError(e.message || t('common.error'));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (!existing) {
    return (
      <Screen>
        <Text style={styles.error}>{error || t('common.error')}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.label}>{t('expenses.amount') || 'Amount'}</Text>
      <TextInput
        style={styles.input}
        value={amountStr}
        onChangeText={setAmountStr}
        keyboardType="decimal-pad"
        editable={!saving}
      />

      <SelectField
        label={t('expenses.category') || 'Category'}
        value={categoryId}
        options={categoryOptions}
        placeholder="Select category"
        onChange={setCategoryId}
        disabled={saving}
      />

      <Text style={styles.label}>{t('expenses.note')}</Text>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder={t('expenses.note')}
        editable={!saving}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={`${t('common.save')} · ${formatLKR(parseMoneyInputToCents(amountStr))}`}
        onPress={save}
        loading={saving}
        disabled={saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  error: { color: colors.danger, marginBottom: spacing.md },
});
