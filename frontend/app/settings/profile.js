import { useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import { useApp } from '../../src/context/AppContext';
import { updateProfile } from '../../src/db/database';
import { colors, spacing } from '../../src/theme';

export default function ProfileSettings() {
  const { profile, refresh, t } = useApp();
  const [name, setName] = useState(profile?.name || '');

  const save = async () => {
    await updateProfile({ name: name.trim() || t('settings.defaultName') });
    await refresh();
  };

  return (
    <Screen scroll>
      <TextInput
        style={styles.input}
        placeholder={t('settings.name')}
        value={name}
        onChangeText={setName}
      />
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
  },
});
