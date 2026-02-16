// Alarm types
export type UnlockMode = 'voice' | 'typing';

export interface Alarm {
  id: string;
  hour: number;
  minute: number;
  repeat_mask: number; // bitmask: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64
  label: string;
  unlock_mode: UnlockMode;
  is_active: boolean;
  created_at: string;
}

export interface Sentence {
  id: number;
  text: string;
  pack_id: string;
  difficulty: number; // 1=easy, 2=medium, 3=hard
}

export interface Settings {
  default_unlock_mode: UnlockMode;
  snooze_enabled: boolean;
  snooze_minutes: number;
}

// Voice recognition states
export type VoiceState = 'idle' | 'listening' | 'processing' | 'success' | 'fail';

// Days of week
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export type DayOfWeek = typeof DAYS[number];
