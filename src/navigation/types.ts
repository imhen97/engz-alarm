export type RootStackParamList = {
  Home: undefined;
  AlarmEdit: { alarmId?: string };
  Ringing: { alarmId: string; unlockMode: string };
  Settings: undefined;
};
