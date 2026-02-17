import React, { useState, useEffect, useRef } from 'react';
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
import { startRepeating, stopRepeating } from '../services/ttsService';
import { checkVoiceMatch, checkTypingMatch } from '../services/matchService';
import {
  setSpeechCallbacks,
  startListening,
  stopListening,
} from '../services/speechService';
import VoiceIndicator from '../components/VoiceIndicator';
import { VoiceState, Sentence, UnlockMode } from '../types';
import { formatTime12 } from '../utils/time';
import { RootStackParamList } from '../navigation/types';

type RingingNav = NativeStackNavigationProp<RootStackParamList, 'Ringing'>;
type RingingRoute = RouteProp<RootStackParamList, 'Ringing'>;

const VOICE_THRESHOLD = 0.8; // 80% accuracy required
const MAX_VOICE_RETRIES = 5;

export default function RingingScreen() {
  const navigation = useNavigation<RingingNav>();
  const route = useRoute<RingingRoute>();

  const { alarmId } = route.params;
  const { alarms, settings, clearRinging } = useAppStore();

  const alarm = alarms.find((a) => a.id === alarmId);
  const [sentence, setSentence] = useState<Sentence | null>(null);
  const [mode, setMode] = useState<UnlockMode>('voice'); // Always start with voice
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceRetries, setVoiceRetries] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [typedText, setTypedText] = useState('');
  const [typingError, setTypingError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [spokenText, setSpokenText] = useState('');

  const vibrationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load sentence and start alarm
  useEffect(() => {
    loadSentence();
    startVibration();

    // Prevent back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => {
      backHandler.remove();
      stopVibration();
      stopRepeating();
      stopListening();
    };
  }, []);

  // Auto-play repeating TTS when sentence loads (EN → KO → repeat)
  useEffect(() => {
    if (sentence) {
      setTimeout(() => {
        startRepeating(sentence.text, sentence.meaning_ko);
      }, 500);
    }
    return () => {
      stopRepeating();
    };
  }, [sentence]);

  // Set up speech recognition callbacks
  useEffect(() => {
    setSpeechCallbacks(
      (spoken: string) => {
        handleVoiceResult(spoken);
      },
      (_error: string) => {
        setVoiceState('fail');
        setSpokenText('');
        setLastScore(null);
      },
    );
  }, [sentence, voiceRetries]);

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
      stopRepeating();
      startRepeating(sentence.text, sentence.meaning_ko);
    }
  };

  // ── Voice mode handlers ──

  const handleStartListening = async () => {
    if (!sentence) return;
    // Pause TTS while listening so it doesn't interfere
    stopRepeating();
    setVoiceState('listening');
    setSpokenText('');
    setLastScore(null);
    await startListening();
  };

  const handleVoiceResult = (spoken: string) => {
    if (!sentence) return;
    setSpokenText(spoken);
    setVoiceState('processing');

    const result = checkVoiceMatch(sentence.text, spoken);
    setLastScore(Math.round(result.score * 100));

    setTimeout(() => {
      if (result.success) {
        setVoiceState('success');
        handleUnlock();
      } else {
        setVoiceState('fail');
        handleVoiceFail();
      }
    }, 500);
  };

  const handleVoiceFail = () => {
    const newRetries = voiceRetries + 1;
    setVoiceRetries(newRetries);

    if (newRetries >= MAX_VOICE_RETRIES) {
      // Switch to typing mode after too many fails
      setMode('typing');
      setVoiceState('idle');
    }
  };

  const handleRetry = () => {
    setVoiceState('idle');
    setSpokenText('');
    setLastScore(null);
    // Resume TTS
    if (sentence) {
      startRepeating(sentence.text, sentence.meaning_ko);
    }
  };

  // ── Typing mode handler ──

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

  // ── Unlock / Snooze ──

  const handleUnlock = () => {
    setUnlocked(true);
    stopVibration();
    stopRepeating();
    stopListening();

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
    stopRepeating();
    stopListening();
    clearRinging();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
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
        <Text style={styles.sentenceLabel}>이 문장을 따라 말하세요:</Text>
        <Text style={styles.sentence}>"{sentence?.text ?? '...'}"</Text>
        <Text style={styles.meaningKo}>{sentence?.meaning_ko ?? ''}</Text>
        <TouchableOpacity onPress={handleReplay} style={styles.replayBtn}>
          <Text style={styles.replayText}>🔊 다시 듣기</Text>
        </TouchableOpacity>
      </View>

      {/* Unlock Area */}
      <View style={styles.unlockArea}>
        {mode === 'voice' ? (
          <View style={styles.voiceArea}>
            <VoiceIndicator state={voiceState} />

            {/* Score feedback */}
            {lastScore !== null && (
              <View style={styles.scoreContainer}>
                <Text style={[
                  styles.scoreText,
                  { color: lastScore >= VOICE_THRESHOLD * 100 ? '#4CAF50' : '#F44336' },
                ]}>
                  정확도: {lastScore}%
                </Text>
                <View style={styles.scoreBarBg}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${lastScore}%`,
                        backgroundColor: lastScore >= VOICE_THRESHOLD * 100 ? '#4CAF50' : '#F44336',
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.thresholdLine,
                      { left: `${VOICE_THRESHOLD * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.thresholdText}>
                  {VOICE_THRESHOLD * 100}% 이상이면 통과
                </Text>
              </View>
            )}

            {/* Spoken text feedback */}
            {spokenText ? (
              <Text style={styles.spokenText}>인식된 음성: "{spokenText}"</Text>
            ) : null}

            {/* Action buttons */}
            {voiceState === 'idle' && (
              <TouchableOpacity
                style={styles.speakBtn}
                onPress={handleStartListening}
              >
                <Text style={styles.speakBtnText}>🎤 탭하고 말하기</Text>
              </TouchableOpacity>
            )}

            {voiceState === 'fail' && (
              <View style={styles.failActions}>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={handleRetry}
                >
                  <Text style={styles.retryBtnText}>
                    다시 시도 ({MAX_VOICE_RETRIES - voiceRetries}회 남음)
                  </Text>
                </TouchableOpacity>
                {voiceRetries >= 3 && (
                  <TouchableOpacity
                    style={styles.switchBtn}
                    onPress={() => setMode('typing')}
                  >
                    <Text style={styles.switchBtnText}>타이핑으로 전환</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {voiceRetries > 0 && voiceRetries < MAX_VOICE_RETRIES && voiceState !== 'fail' && (
              <Text style={styles.retryCount}>
                시도 {voiceRetries}/{MAX_VOICE_RETRIES}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.typingArea}>
            <Text style={styles.typingLabel}>문장을 타이핑하세요:</Text>
            <TextInput
              style={[styles.typingInput, typingError && styles.typingInputError]}
              value={typedText}
              onChangeText={setTypedText}
              placeholder="여기에 영어 문장을 입력..."
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
              <Text style={styles.submitBtnText}>제출</Text>
            </TouchableOpacity>
            {typingError && (
              <Text style={styles.errorText}>정확하지 않아요. 다시 시도해보세요!</Text>
            )}
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => {
                setMode('voice');
                setVoiceState('idle');
                setVoiceRetries(0);
                setLastScore(null);
                setSpokenText('');
              }}
            >
              <Text style={styles.switchBtnText}>음성 인식으로 전환</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Snooze */}
      {settings.snooze_enabled && (
        <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze}>
          <Text style={styles.snoozeText}>
            스누즈 ({settings.snooze_minutes}분)
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
    marginBottom: 24,
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
    marginBottom: 24,
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
    marginBottom: 8,
  },
  meaningKo: {
    fontSize: 16,
    color: '#AABBFF',
    textAlign: 'center',
    lineHeight: 24,
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
    gap: 16,
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
  scoreContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
  },
  scoreBarBg: {
    width: '80%',
    height: 10,
    backgroundColor: '#2a2a3e',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  thresholdLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  thresholdText: {
    fontSize: 12,
    color: '#888',
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
