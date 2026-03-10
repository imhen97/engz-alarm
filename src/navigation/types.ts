export type RootStackParamList = {
  Home: undefined;
  AlarmEdit: { alarmId?: string };
  Ringing: { alarmId: string; unlockMode: string; snoozeCount?: number };
  Settings: undefined;
  NightInput: undefined;
  Streak: undefined;
  LevelTest: undefined;
  ReviewQuiz: undefined;
  SentenceQuiz: { mode: 'today' | 'cumulative' };
  Pet: undefined;
  Shop: undefined;
};
