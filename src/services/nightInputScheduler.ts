import * as Notifications from 'expo-notifications';
import { Settings } from '../types';

const NIGHT_INPUT_TYPE = 'night_input';

/** "HH:mm" 또는 "H:mm" 파싱. 공백 trim, "off"면 null. */
function parseNightInputTime(time?: string | null): { hour: number; minute: number } | null {
  const raw = typeof time === 'string' ? time.trim().toLowerCase() : '';
  if (!raw || raw === 'off') return null;
  const parts = raw.split(':').map((s) => s.trim());
  if (parts.length !== 2) return null;
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** 저장용 시간 문자열 정규화 (예: "9:0" -> "09:00") */
export function formatNightInputTime(hour: number, minute: number): string {
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  const m = Math.max(0, Math.min(59, Math.floor(minute)));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export async function rescheduleNightInputFromSettings(settings: Settings): Promise<void> {
  // Cancel existing night_input notifications
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const nightOnes = scheduled.filter(
    (n) => (n.request?.content?.data as any)?.type === NIGHT_INPUT_TYPE
  );
  await Promise.all(
    nightOnes.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  const parsed = parseNightInputTime(settings.night_input_time);
  if (!parsed) {
    // Off 상태이거나 잘못된 값이면 새로 스케줄하지 않음
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Night Input',
      body: '내일 아침에 쓸 영어 문장을 미리 보고 준비해볼까요?',
      data: { type: NIGHT_INPUT_TYPE },
      sound: false,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    // 매일 같은 시각에 반복 (trigger에 type 필수)
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: parsed.hour,
      minute: parsed.minute,
    },
  });
}

