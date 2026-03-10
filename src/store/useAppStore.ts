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
  addCoins: (amount: number) => Promise<void>;
  feedPet: () => Promise<void>;
  setPetAccessories: (ids: string[]) => Promise<void>;
  setOwnedDecorations: (ids: string[]) => Promise<void>;

  // Init
  initialized: boolean;
  setInitialized: (val: boolean) => void;
}

const DEFAULT_SETTINGS: Settings = {
  default_unlock_mode: 'voice',
  snooze_enabled: true,
  snooze_minutes: 5,
  user_level: 2,
  sub_level: 1,
  selected_packs: ['morning_basics'],
  user_xp: 0,
  user_coins: 0,
  test_completed: false,
  night_input_time: '22:00',
  daily_new_sentences: 2,
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
      if (row.key === 'user_level') {
        settings.user_level = parseInt(row.value, 10) || 2;
      }
      if (row.key === 'sub_level') {
        settings.sub_level = parseInt(row.value, 10) || 1;
      }
      if (row.key === 'selected_packs') {
        try {
          settings.selected_packs = JSON.parse(row.value);
        } catch {
          settings.selected_packs = ['morning_basics'];
        }
      }
      if (row.key === 'user_xp') {
        settings.user_xp = parseInt(row.value, 10) || 0;
      }
      if (row.key === 'user_coins') {
        settings.user_coins = parseInt(row.value, 10) || 0;
      }
      if (row.key === 'pet_last_fed') {
        settings.pet_last_fed = row.value || undefined;
      }
      if (row.key === 'pet_accessories') {
        try {
          settings.pet_accessories = JSON.parse(row.value);
        } catch {
          settings.pet_accessories = [];
        }
      }
      if (row.key === 'owned_decorations') {
        try {
          settings.owned_decorations = JSON.parse(row.value);
        } catch {
          settings.owned_decorations = [];
        }
      }
      if (row.key === 'test_completed') {
        settings.test_completed = row.value === 'true';
      }
      if (row.key === 'night_input_time') {
        settings.night_input_time = row.value || '22:00';
      }
      if (row.key === 'daily_new_sentences') {
        const n = parseInt(row.value, 10);
        settings.daily_new_sentences = n >= 1 && n <= 3 ? n : 2;
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
  addCoins: async (amount: number) => {
    const { settings, updateSetting } = get();
    const next = Math.max(0, (settings.user_coins ?? 0) + amount);
    await updateSetting('user_coins', next.toString());
  },
  feedPet: async () => {
    await get().updateSetting('pet_last_fed', new Date().toISOString());
  },
  setPetAccessories: async (ids: string[]) => {
    await get().updateSetting('pet_accessories', JSON.stringify(ids));
  },
  setOwnedDecorations: async (ids: string[]) => {
    await get().updateSetting('owned_decorations', JSON.stringify(ids));
  },

  // Init
  initialized: false,
  setInitialized: (val: boolean) => set({ initialized: val }),
}));
