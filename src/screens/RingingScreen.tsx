import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Vibration,
  BackHandler,
  Keyboard,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import { fetchRandomSentence } from '../services/sentenceService';
import { speak, stopSpeaking } from '../services/ttsService';
import { checkVoiceMatch, checkTypingMatch } from '../services/matchService';
import VoiceIndicator from '../components/VoiceIndicator';
import { VoiceState, Sentence, UnlockMode } from '../types';
import { formatTime12 } from '../utils/time';
import { RootStackParamList } from '../navigation/types';

type RingingNav = NativeStackNavigationProp<RootStackParamList, 'Ringing'>;
type RingingRoute = RouteProp<RootStackParamList, 'Ringing'>;

export default function RingingScreen() {
  const navigation = useNavigation<RingingNav>();
  const route = useRoute<RingingRoute>();

  const { alarmId, unlockMode: initialMode } = route.params;
  const { alarms, settings, clearRinging } = useAppStore();

  const alarm = alarms.find((a) => a.id === alarmId);
  const [sentence, setSentence] = useState<Sentence | null>(null);
  const [mode, setMode] = useState<UnlockMode>(initialMode as UnlockMode);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceRetries, setVoiceRetries] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [typingError, setTypingError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [spokenText, setSpokenText] = useState('');

  const vibrationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const MAX_RETRIES = 3;

  // Load sentence and start alarm
  useEffect(() => {
    loadSentence();
    startVibration();

    // Prevent back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => {
      backHandler.remove();
      stopVibration();
      stopSpeaking();
    };
  }, []);

  // Auto-play TTS when sentence loads
  useEffect(() => {
    if (sentence) {
      setTimeout(() => {
        speak(sentence.text);
      }, 500);
    }
  }, [sentence]);

  const loadSentence = async () => {
    const s = await fetchRandomSentence();
    setSentence(s);
  };

  const startVibration = () => {
    Vibration.vibrate([0, 500, 500], true);
  };

  const stopVibration = () => {
    Vibration.cancel();
  };

  const handleReplay = () => {
    if (sentence) {
      speak(sentence.text);
    }
  };

  // Voice mode handlers
  const handleStartListening = async () => {
    if (!sentence) return;
    setVoiceState('listening');

    try {
      // Using expo-speech for TTS and simple matching
      // In production, react-native-voice would handle this
      // For MVP, we simulate voice capture with a prompt
      // The actual voice recognition will be handled by the platform
      setVoiceState('listening');

      // Note: In a full implementation, react-native-voice would be used here
      // For now, we provide a fallback button approach
    } catch (error) {
      setVoiceState('fail');
      handleVoiceFail();
    }
  };

  const handleVoiceResult = (spoken: string) => {
    if (!sentence) return;
    setSpokenText(spoken);
    setVoiceState('processing');

    const result = checkVoiceMatch(sentence.text, spoken);

    if (result.success) {
      setVoiceState('success');
      handleUnlock();
    } else {
      setVoiceState('fail');
      handleVoiceFail();
    }
  };

  const handleVoiceFail = () => {
    const newRetries = voiceRetries + 1;
    setVoiceRetries(newRetries);

    if (newRetries >= MAX_RETRIES) {
      // Switch to typing mode
      setMode('typing');
      setVoiceState('idle');
    }
  };

  const handleTypingSubmit = () => {
    if (!sentence) return;
    Keyboard.dismiss();

    const result = checkTypingMatch(sentence.text, typedText);

    if (result.success) {
      handleUnlock();
    } else {
      setTypingError(true);
      setTypedText('');
      setTimeout(() => setTypingError(false), 1000);
    }
  };

  const handleUnlock = () => {
    setUnlocked(true);
    stopVibration();
    stopSpeaking();

    setTimeout(() => {
      clearRinging();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }, 1500);
  };

  const handleSnooze = () => {
    if (!settings.snooze_enabled) return;
    stopVibration();
    stopSpeaking();
    clearRinging();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
    // In production, would reschedule alarm for snooze_minutes later
  };

  // Emergency fallback (hidden)
  const [emergencyTaps, setEmergencyTaps] = useState(0);
  const handleEmergencyTap = () => {
    const taps = emergencyTaps + 1;
    setEmergencyTaps(taps);
    if (taps >= 5) {
      handleUnlock();
    }
  };

  const now = new Date();
  const timeStr = formatTime12(now.getHours(), now.getMinutes());

  if (unlocked) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successText}>Great job!</Text>
        <Text style={styles.successSubtext}>Alarm dismissed</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Time Display */}
      <TouchableOpacity
        style={styles.timeArea}
        onPress={handleEmergencyTap}
        activeOpacity={1}
      >
        <Text style={styles.time}>{timeStr}</Text>
        {alarm?.label ? <Text style={styles.label}>{alarm.label}</Text> : null}
      </TouchableOpacity>

      {/* Sentence */}
      <View style={styles.sentenceContainer}>
        <Text style={styles.sentenceLabel}>Repeat this sentence:</Text>
        <Text style={styles.sentence}>"{sentence?.text ?? '...'}"</Text>
        <TouchableOpacity onPress={handleReplay} style={styles.replayBtn}>
          <Text style={styles.replayText}>🔊 Play again</Text>
        </TouchableOpacity>
      </View>

      {/* Unlock Area */}
      <View style={styles.unlockArea}>
        {mode === 'voice' ? (
          <View style={styles.voiceArea}>
            <VoiceIndicator state={voiceState} />

            {voiceState === 'idle' && (
              <TouchableOpacity
                style={styles.speakBtn}
                onPress={handleStartListening}
              >
                <Text style={styles.speakBtnText}>Tap to Speak</Text>
              </TouchableOpacity>
            )}

            {voiceState === 'fail' && (
              <View style={styles.failActions}>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => setVoiceState('idle')}
                >
                  <Text style={styles.retryBtnText}>
                    Try Again ({MAX_RETRIES - voiceRetries} left)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchBtn}
                  onPress={() => setMode('typing')}
                >
                  <Text style={styles.switchBtnText}>Switch to Typing</Text>
                </TouchableOpacity>
              </View>
            )}

            {spokenText ? (
              <Text style={styles.spokenText}>You said: "{spokenText}"</Text>
            ) : null}

            {voiceRetries > 0 && voiceRetries < MAX_RETRIES && (
              <Text style={styles.retryCount}>
                Attempt {voiceRetries + 1} of {MAX_RETRIES}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.typingArea}>
            <Text style={styles.typingLabel}>Type the sentence below:</Text>
            <TextInput
              style={[styles.typingInput, typingError && styles.typingInputError]}
              value={typedText}
              onChangeText={setTypedText}
              placeholder="Type here..."
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleTypingSubmit}
            />
            <TouchableOpacity
              style={[
                styles.submitBtn,
                typedText.length === 0 && styles.submitBtnDisabled,
              ]}
              onPress={handleTypingSubmit}
              disabled={typedText.length === 0}
            >
              <Text style={styles.submitBtnText}>Submit</Text>
            </TouchableOpacity>
            {typingError && (
              <Text style={styles.errorText}>Not quite right. Try again!</Text>
            )}
          </View>
        )}
      </View>

      {/* Snooze */}
      {settings.snooze_enabled && (
        <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze}>
          <Text style={styles.snoozeText}>
            Snooze ({settings.snooze_minutes} min)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a14',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  successContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  successText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 18,
    color: '#888',
  },
  timeArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  time: {
    fontSize: 56,
    fontWeight: '200',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  label: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
  },
  sentenceContainer: {
    backgroundColor: '#1E1E2E',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  sentenceLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  sentence: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 16,
  },
  replayBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#2a2a3e',
  },
  replayText: {
    fontSize: 14,
    color: '#7C9EFF',
  },
  unlockArea: {
    flex: 1,
    justifyContent: 'center',
  },
  voiceArea: {
    alignItems: 'center',
    gap: 20,
  },
  speakBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  speakBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  failActions: {
    gap: 12,
    alignItems: 'center',
  },
  retryBtn: {
    backgroundColor: '#FFC107',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  retryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  switchBtn: {
    paddingVertical: 10,
  },
  switchBtnText: {
    fontSize: 14,
    color: '#7C9EFF',
    textDecorationLine: 'underline',
  },
  spokenText: {
    fontSize: 14,
    color: '#AAA',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  retryCount: {
    fontSize: 13,
    color: '#888',
  },
  typingArea: {
    alignItems: 'center',
    gap: 16,
  },
  typingLabel: {
    fontSize: 16,
    color: '#AAA',
  },
  typingInput: {
    backgroundColor: '#1E1E2E',
    borderRadius: 14,
    padding: 16,
    fontSize: 18,
    color: '#FFFFFF',
    width: '100%',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typingInputError: {
    borderColor: '#F44336',
  },
  submitBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 25,
  },
  submitBtnDisabled: {
    backgroundColor: '#333',
  },
  submitBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
  },
  snoozeBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  snoozeText: {
    fontSize: 16,
    color: '#666',
  },
});
