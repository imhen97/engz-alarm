import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { useAppStore } from './src/store/useAppStore';
import { initializeSentences } from './src/services/sentenceService';
import { requestNotificationPermission } from './src/services/alarmScheduler';
import { rescheduleNightInputFromSettings } from './src/services/nightInputScheduler';
import { getDatabase } from './src/db/sqlite';
import { navigateToRinging, navigateToNightInput } from './src/navigation/navigationRef';
import { initPreferredVoices } from './src/services/ttsService';
import { checkAndUpdateAtMidnight } from './src/services/dailySentencesService';

// Configure notifications to show when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function AppContent() {
  const { loadAlarms, loadSettings, initialized, setInitialized } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const midnightCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initializeApp();

    // 자정(00:00) 체크: 1분마다 확인하여 자정이 지났으면 오늘의 문장 업데이트
    const startMidnightChecker = () => {
      const checkMidnight = async () => {
        if (AppState.currentState === 'active') {
          const { settings } = useAppStore.getState();
          await checkAndUpdateAtMidnight(settings);
        }
      };

      // 즉시 한 번 체크
      checkMidnight();

      // 1분마다 체크 (자정 감지용)
      midnightCheckInterval.current = setInterval(checkMidnight, 60 * 1000);
    };

    startMidnightChecker();

    // AppState 변경 감지: 포그라운드로 돌아올 때도 체크
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const { settings } = useAppStore.getState();
        checkAndUpdateAtMidnight(settings);
      }
    });

    // When a notification is received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request?.content?.data as any;
        if (data?.alarmId) {
          navigateToRinging(
            data.alarmId as string,
            (data.unlockMode as string) || 'typing'
          );
        } else if (data?.type === 'night_input') {
          navigateToNightInput();
        }
      }
    );

    // When user taps on notification (app in background/killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request?.content?.data as any;
        if (data?.alarmId) {
          navigateToRinging(
            data.alarmId as string,
            (data.unlockMode as string) || 'typing'
          );
        } else if (data?.type === 'night_input') {
          navigateToNightInput();
        }
      }
    );

    return () => {
      if (midnightCheckInterval.current) {
        clearInterval(midnightCheckInterval.current);
      }
      subscription.remove();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await getDatabase();

      // Load data + TTS 자연스러운 음성 선택 (Enhanced 등)
      await Promise.all([
        loadAlarms(),
        loadSettings(),
        initializeSentences(),
        initPreferredVoices(),
      ]);

      // Schedule Night Input notification based on loaded settings
      const { settings } = useAppStore.getState();
      await rescheduleNightInputFromSettings(settings);

      // Request notification permission
      await requestNotificationPermission();

      setInitialized(true);
      setLoading(false);
    } catch (err) {
      console.error('App initialization error:', err);
      setError('Failed to initialize app. Please restart.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>ENGZ Alarm</Text>
        <ActivityIndicator size="large" color="#FF6B35" style={styles.spinner} />
        <Text style={styles.loadingText}>준비 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const { settings } = useAppStore.getState();
  const initialRoute = settings.test_completed ? 'Home' : 'LevelTest';

  return <AppNavigator initialRoute={initialRoute as any} />;
}

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <AppContent />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
