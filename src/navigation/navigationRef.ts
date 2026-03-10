import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToRinging(alarmId: string, unlockMode: string, snoozeCount?: number) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Ringing', { alarmId, unlockMode, snoozeCount: snoozeCount ?? 0 });
  }
}

export function navigateToNightInput() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('NightInput');
  }
}
