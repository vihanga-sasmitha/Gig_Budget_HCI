import { useEffect, useState } from 'react';
import { Text, TextInput, StyleSheet, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import CategoryChip from '../../src/components/CategoryChip';
import { createTransaction, listCategories, listPlatforms } from '../../src/db/database';
import { parseMoneyInputToCents } from '../../src/utils/money';
import { useApp } from '../../src/context/AppContext';
import { colors, spacing, typography } from '../../src/theme';

export default function NewIncome() {
  const router = useRouter();
  const { refresh, t } = useApp();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [platform, setPlatform] = useState(null);

  useEffect(() => {
    (async () => {
      setCategories(await listCategories('income'));
      setPlatforms(await listPlatforms());
    })();
  }, []);

  const save = async () => {
    const cents = parseMoneyInputToCents(amount);
    if (!cents) return;
    await createTransaction({
      kind: 'income',
      amount_cents: cents,
      category_id: categoryId,
      platform,
      note,
    });
    await refresh();
    router.back();
  };

  return (
    <Screen scroll>
      <TextInput
        style={styles.input}
        placeholder="Amount"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <Text style={typography.subtitle}>{t('income.source')}</Text>
      <View style={styles.wrap}>
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
      <Text style={typography.subtitle}>{t('expenses.platform')}</Text>
      <ScrollView horizontal>
        <View style={styles.wrap}>
          {platforms.map((p) => (
            <CategoryChip
              key={p.id}
              label={p.name}
              selected={platform === p.platform}
              onPress={() => setPlatform(p.platform)}
            />
          ))}
        </View>
      </ScrollView>
      <TextInput style={styles.input} placeholder={t('expenses.note')} value={note} onChangeText={setNote} />
      <Button title={t('common.save')} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: spacing.sm },
});
