import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

/**
 * Expo Go (Android) throws on import of expo-notifications because remote push
 * token auto-registration was removed in SDK 53+. Keep bill CRUD working by
 * never loading that module in Expo Go; local schedule APIs still work in a
 * development build / production APK.
 */
const isExpoGoAndroid = Platform.OS === 'android' && isRunningInExpoGo();

let Notifications = null;
let handlerReady = false;

function loadNotificationsModule() {
  if (isExpoGoAndroid) return null;
  if (Notifications) return Notifications;
  // Lazy require — a top-level import crashes Expo Go before any guard runs.
  // eslint-disable-next-line global-require
  Notifications = require('expo-notifications');
  if (!handlerReady) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    handlerReady = true;
  }
  return Notifications;
}

const scheduledIds = new Map();

export async function ensureNotificationPermission() {
  const NotificationsApi = loadNotificationsModule();
  if (!NotificationsApi) return false;
  try {
    const current = await NotificationsApi.getPermissionsAsync();
    if (
      current.granted ||
      current.ios?.status === NotificationsApi.IosAuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }
    const asked = await NotificationsApi.requestPermissionsAsync();
    return Boolean(
      asked.granted ||
        asked.ios?.status === NotificationsApi.IosAuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

function dueDateToTrigger(dueKey, reminderDays = 1) {
  const [y, m, d] = String(dueKey).split('-').map(Number);
  if (!y || !m || !d) return null;
  const due = new Date(y, m - 1, d, 9, 0, 0);
  const fire = new Date(due.getTime() - Math.max(0, reminderDays) * 24 * 60 * 60 * 1000);
  if (fire.getTime() <= Date.now()) {
    return { date: new Date(Date.now() + 15 * 1000) };
  }
  return { date: fire };
}

export async function scheduleBillReminder(bill) {
  if (!bill?.id || bill.paid) return null;
  const NotificationsApi = loadNotificationsModule();
  if (!NotificationsApi) return null;

  const allowed = await ensureNotificationPermission();
  if (!allowed) return null;

  await cancelBillReminder(bill.id);

  const trigger = dueDateToTrigger(bill.due_key, bill.reminder_days ?? 1);
  if (!trigger) return null;

  try {
    if (Platform.OS === 'android') {
      await NotificationsApi.setNotificationChannelAsync('bills', {
        name: 'Bill reminders',
        importance: NotificationsApi.AndroidImportance.DEFAULT,
      });
    }
    const notifId = await NotificationsApi.scheduleNotificationAsync({
      content: {
        title: `Bill due: ${bill.name}`,
        body: `Due on ${bill.due_key}. Open GigBudget to mark paid.`,
        data: { billId: bill.id, type: 'bill_due' },
      },
      trigger: {
        type: NotificationsApi.SchedulableTriggerInputTypes.DATE,
        date: trigger.date,
        channelId: Platform.OS === 'android' ? 'bills' : undefined,
      },
    });
    scheduledIds.set(bill.id, notifId);
    return notifId;
  } catch {
    return null;
  }
}

export async function cancelBillReminder(billId) {
  const NotificationsApi = loadNotificationsModule();
  if (!NotificationsApi) {
    scheduledIds.delete(billId);
    return;
  }
  const existing = scheduledIds.get(billId);
  try {
    if (existing) {
      await NotificationsApi.cancelScheduledNotificationAsync(existing);
      scheduledIds.delete(billId);
    }
  } catch {
    // Ignore cancel failures — app and inbox remain usable.
  }
}

export function areLocalNotificationsAvailable() {
  return !isExpoGoAndroid && Boolean(loadNotificationsModule());
}
