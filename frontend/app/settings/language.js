import { Text, StyleSheet, Pressable, View } from 'react-native';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import { useApp } from '../../src/context/AppContext';
import { updateProfile } from '../../src/db/database';
import { isFullyTranslated } from '../../src/i18n';
import { colors, spacing } from '../../src/theme';

const LANGS = [
  { code: 'en', labelKey: 'settings.english' },
  { code: 'si', labelKey: 'settings.sinhala' },
  { code: 'ta', labelKey: 'settings.tamil' },
];

export default function LanguageSettings() {
  const { profile, refresh, t, lang } = useApp();

  const select = async (code) => {
    await updateProfile({ language: code });
    await refresh();
  };

  return (
    <Screen scroll>
      {LANGS.map((l) => (
        <Pressable key={l.code} onPress={() => select(l.code)}>
          <Card style={[styles.row, lang === l.code && styles.active]}>
            <Text style={styles.label}>{t(l.labelKey)}</Text>
            {!isFullyTranslated(l.code) ? (
              <Text style={styles.soon}>{t('common.comingSoon')}</Text>
            ) : null}
          </Card>
        </Pressable>
      ))}
      <View style={styles.note}>
        <Text style={styles.noteText}>
          Sinhala and Tamil use partial catalogs; UI falls back to English for missing strings.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  active: { borderColor: colors.primary, borderWidth: 2 },
  label: { fontSize: 16, fontWeight: '600', color: colors.text },
  soon: { color: colors.warning, fontSize: 13 },
  note: { marginTop: spacing.lg },
  noteText: { color: colors.textSecondary, lineHeight: 20 },
});
