import { useCallback, useEffect, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import EmptyState from '../../src/components/EmptyState';
import { useApp } from '../../src/context/AppContext';
import { listNotifications, markNotificationsRead } from '../../src/db/database';
import { colors, spacing } from '../../src/theme';

export default function NotificationsInbox() {
  const { refreshToken, t } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await listNotifications());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  return (
    <Screen scroll>
      <Button
        title={t('notifications.markRead')}
        variant="secondary"
        onPress={async () => {
          await markNotificationsRead();
          load();
        }}
      />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : items.length === 0 ? (
        <EmptyState icon="notifications-outline" message={t('common.empty')} />
      ) : (
        items.map((n) => (
          <Card key={n.id} style={[styles.card, !n.read_flag && styles.unread]}>
            <Text style={styles.title}>{n.title}</Text>
            <Text style={styles.body}>{n.body}</Text>
            <Text style={styles.time}>{new Date(n.created_at).toLocaleString('en-LK')}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.sm },
  unread: { borderColor: colors.primary, borderWidth: 2 },
  title: { fontWeight: '700', color: colors.text },
  body: { color: colors.textSecondary, marginTop: 4 },
  time: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.sm },
});
