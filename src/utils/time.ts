import { DAYS } from '../types';

/**
 * Format hour and minute to display string (e.g., "07:30")
 */
export function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Format hour and minute to 12-hour display (e.g., "7:30 AM")
 */
export function formatTime12(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

/**
 * Parse repeat_mask bitmask to day names
 * Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64
 */
export function repeatMaskToDays(mask: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    if (mask & (1 << i)) {
      days.push(DAYS[i]);
    }
  }
  return days;
}

/**
 * Convert array of day indices (0=Sun, 1=Mon, ...) to bitmask
 */
export function daysToRepeatMask(dayIndices: number[]): number {
  let mask = 0;
  for (const idx of dayIndices) {
    mask |= (1 << idx);
  }
  return mask;
}

/**
 * Get human-readable repeat description
 */
export function repeatDescription(mask: number): string {
  if (mask === 0) return 'Once';
  if (mask === 0b1111111) return 'Every day';
  if (mask === 0b0111110) return 'Weekdays';
  if (mask === 0b1000001) return 'Weekends';
  return repeatMaskToDays(mask).join(', ');
}

/**
 * Calculate the next trigger date for an alarm
 */
export function getNextTriggerDate(hour: number, minute: number, repeatMask: number): Date {
  const now = new Date();
  const today = now.getDay(); // 0=Sun

  // Try today first
  const todayTrigger = new Date();
  todayTrigger.setHours(hour, minute, 0, 0);

  if (repeatMask === 0) {
    // One-time alarm
    if (todayTrigger > now) {
      return todayTrigger;
    }
    // If time passed today, schedule for tomorrow
    todayTrigger.setDate(todayTrigger.getDate() + 1);
    return todayTrigger;
  }

  // Repeating alarm: find next matching day
  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (today + offset) % 7;
    if (repeatMask & (1 << dayIndex)) {
      const trigger = new Date();
      trigger.setDate(trigger.getDate() + offset);
      trigger.setHours(hour, minute, 0, 0);
      if (trigger > now) {
        return trigger;
      }
    }
  }

  // All days this week have passed, try next week
  for (let offset = 1; offset <= 7; offset++) {
    const dayIndex = (today + offset) % 7;
    if (repeatMask & (1 << dayIndex)) {
      const trigger = new Date();
      trigger.setDate(trigger.getDate() + offset);
      trigger.setHours(hour, minute, 0, 0);
      return trigger;
    }
  }

  // Fallback: tomorrow
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(hour, minute, 0, 0);
  return fallback;
}
