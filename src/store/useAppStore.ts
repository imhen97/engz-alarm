import { create } from 'zustand';
import { Alarm, Settings, Sentence, UnlockMode } from '../types';
import * as alarmRepo from '../db/alarmRepo';
import { getDatabase } from '../db/sqlite';

interface AppState {
  // Alarms
  alarms: Alarm[];
  loadAlarms: () => Promise<void>;
  addAlarm: (alarm: Alarm) => Promise<void>;
  updateAlarm: (alarm: Alarm) => Promise<void>;
  removeAlarm: (id: string) => Promise<void>;
  toggleAlarm: (id: string, isActive: boolean) => Promise<void>;

  // Ringing state
  ringingAlarmId: string | null;
  ringingUnlockMode: UnlockMode;
  currentSentence: Sentence | null;
  setRinging: (alarmId: string, unlockMode: UnlockMode, sentence: Sentence) => void;
  clearRinging: () => void;
  switchToTyping: () => void;

  // Settings
  settings: Settings;
  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;

  // Init
  initialized: boolean;
  setInitialized: (val: boolean) => void;
}

const DEFAULT_SETTINGS: Settings = {
  default_unlock_mode: 'voice',
  snooze_enabled: true,
  snooze_minutes: 5,
};

export const useAppStore = create<AppState>((set, get) => ({
  // Alarms
  alarms: [],
  loadAlarms: async () => {
    const alarms = await alarmRepo.getAllAlarms();
    set({ alarms });
  },
  addAlarm: async (alarm: Alarm) => {
    await alarmRepo.insertAlarm(alarm);
    set((state) => ({ alarms: [...state.alarms, alarm] }));
  },
  updateAlarm: async (alarm: Alarm) => {
    await alarmRepo.updateAlarm(alarm);
    set((state) => ({
      alarms: state.alarms.map((a) => (a.id === alarm.id ? alarm : a)),
    }));
  },
  removeAlarm: async (id: string) => {
    await alarmRepo.deleteAlarm(id);
    set((state) => ({
      alarms: state.alarms.filter((a) => a.id !== id),
    }));
  },
  toggleAlarm: async (id: string, isActive: boolean) => {
    await alarmRepo.toggleAlarm(id, isActive);
    set((state) => ({
      alarms: state.alarms.map((a) =>
        a.id === id ? { ...a, is_active: isActive } : a
      ),
    }));
  },

  // Ringing state
  ringingAlarmId: null,
  ringingUnlockMode: 'voice',
  currentSentence: null,
  setRinging: (alarmId, unlockMode, sentence) => {
    set({
      ringingAlarmId: alarmId,
      ringingUnlockMode: unlockMode,
      currentSentence: sentence,
    });
  },
  clearRinging: () => {
    set({
      ringingAlarmId: null,
      currentSentence: null,
    });
  },
  switchToTyping: () => {
    set({ ringingUnlockMode: 'typing' });
  },

  // Settings
  settings: DEFAULT_SETTINGS,
  loadSettings: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT * FROM settings'
    );
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if (row.key === 'default_unlock_mode') {
        settings.default_unlock_mode = row.value as UnlockMode;
      }
      if (row.key === 'snooze_enabled') {
        settings.snooze_enabled = row.value === 'true';
      }
      if (row.key === 'snooze_minutes') {
        settings.snooze_minutes = parseInt(row.value, 10) || 5;
      }
    }
    set({ settings });
  },
  updateSetting: async (key: string, value: string) => {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
    await get().loadSettings();
  },

  // Init
  initialized: false,
  setInitialized: (val: boolean) => set({ initialized: val }),
}));
