import { useEffect, useState } from 'react';
import { Text, View, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Keypad from '../../src/components/Keypad';
import CategoryChip from '../../src/components/CategoryChip';
import Button from '../../src/components/Button';
import { useApp } from '../../src/context/AppContext';
import { createTransaction, listCategories } from '../../src/db/database';
import { parseMoneyInputToCents } from '../../src/utils/money';
import { formatMoney } from '../../src/currency/formatMoney';
import { useTheme } from '../../src/theme';

export default function QuickExpense() {
  const router = useRouter();
  const { refresh, t, ledgerCurrency, displayCurrency, fxSnapshot } = useApp();
  const { colors, spacing, typography, radii } = useTheme();
  const [amountStr, setAmountStr] = useState('0');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    listCategories('expense').then(setCategories);
  }, []);

  const onKey = (key) => {
    setAmountStr((prev) => {
      if (key === 'back') {
        const next = prev.length <= 1 ? '0' : prev.slice(0, -1);
        return next;
      }
      if (key === '.') {
        if (prev.includes('.')) return prev;
        return `${prev}.`;
      }
      if (prev.includes('.')) {
        const frac = prev.split('.')[1] || '';
        if (frac.length >= 2) return prev;
      }
      if (prev === '0') return key;
      return prev + key;
    });
  };

  const cents = parseMoneyInputToCents(amountStr);
  const ledgerLabel = formatMoney(cents, {
    ledgerCurrency,
    displayCurrency: ledgerCurrency,
  });
  const displayPreview =
    displayCurrency !== ledgerCurrency
      ? formatMoney(cents, {
          ledgerCurrency,
          displayCurrency,
          snapshot: fxSnapshot,
        })
      : null;

  const save = async () => {
    if (!cents || cents <= 0 || !categoryId) {
      setMessage('Enter a valid amount and category');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const created = await createTransaction({
        kind: 'expense',
        amount_cents: cents,
        category_id: categoryId,
        note,
      });
      await refresh();
      router.replace(`/expense/confirm?id=${created.id}`);
    } catch (e) {
      setMessage(e.message || t('common.error'));
      setSaving(false);
    }
  };

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <Text
        style={{
          fontSize: 36,
          fontWeight: '800',
          color: colors.primaryDark,
          textAlign: 'center',
          marginVertical: spacing.md,
        }}
      >
        {ledgerLabel}
      </Text>
      <Text style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: spacing.sm }}>
        Entered in {ledgerCurrency}
        {displayPreview ? ` · ≈ ${displayPreview}` : ''}
      </Text>
      <Keypad onKey={onKey} />
      <Text style={{ ...typography.subtitle, marginTop: spacing.lg, marginBottom: spacing.sm }}>
        {t('expenses.category')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'nowrap', paddingBottom: spacing.sm }}>
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              label={c.name}
              color={c.color}
              selected={categoryId === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
        </View>
      </ScrollView>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.md,
          padding: spacing.md,
          backgroundColor: colors.inputBg,
          marginVertical: spacing.md,
          color: colors.text,
        }}
        placeholder={t('expenses.note')}
        placeholderTextColor={colors.textSecondary}
        value={note}
        onChangeText={setNote}
      />
      {message ? (
        <Text style={{ color: colors.success, textAlign: 'center', marginBottom: spacing.sm }}>
          {message}
        </Text>
      ) : null}
      <Button title={t('common.save')} onPress={save} loading={saving} />
    </Screen>
  );
}
