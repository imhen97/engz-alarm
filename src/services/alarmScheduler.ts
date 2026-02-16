import * as Notifications from 'expo-notifications';
import { Alarm } from '../types';
import { getNextTriggerDate } from '../utils/time';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function scheduleAlarm(alarm: Alarm): Promise<string | null> {
  if (!alarm.is_active) return null;

  const triggerDate = getNextTriggerDate(alarm.hour, alarm.minute, alarm.repeat_mask);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ENGZ Alarm',
      body: alarm.label || 'Time to practice English!',
      data: { alarmId: alarm.id, unlockMode: alarm.unlock_mode },
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return notificationId;
}

export async function cancelAlarm(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllAlarms(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function rescheduleAllAlarms(alarms: Alarm[]): Promise<void> {
  await cancelAllAlarms();
  for (const alarm of alarms) {
    if (alarm.is_active) {
      await scheduleAlarm(alarm);
    }
  }
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(handler);
}
