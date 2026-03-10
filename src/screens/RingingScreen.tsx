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
  Modal,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import { fetchAdaptiveSentence } from '../services/sentenceService';
import { getOrCreateDailySentences, pickOneFromDaily } from '../services/dailySentencesService';
import { startRepeating, stopRepeating } from '../services/ttsService';
import { checkVoiceMatch, checkTypingMatch } from '../services/matchService';
import {
  setSpeechCallbacks,
  startListening,
  stopListening,
  isSpeechRecognitionAvailable,
} from '../services/speechService';
import VoiceIndicator from '../components/VoiceIndicator';
import { VoiceState, Sentence, UnlockMode } from '../types';
import { formatTime12 } from '../utils/time';
import { RootStackParamList } from '../navigation/types';
import { scheduleAlarm } from '../services/alarmScheduler';
import { colors, shadows, borderRadius } from '../theme';
import { recordStreak } from '../db/streakRepo';
import { recordAttempt } from '../db/sentenceRepo';
import {
  addXP,
  incrementTotalCorrect,
  incrementTotalAttempts,
  getTotalCorrect,
  unlockBadge,
  getUsedPacks,
  hadSuccessBefore,
  addNewLearnedSentence,
} from '../db/progressRepo';
import { getCurrentStreak } from '../db/streakRepo';
import { getLevelLabel, getLevelEmoji, BADGES } from '../data/badges';
import { getDueVocabQuizForToday, markVocabQuizPassedToday } from '../services/dailyVocabService';
import type { VocabItem } from '../data/vocabulary';

type RingingNav = NativeStackNavigationProp<RootStackParamList, 'Ringing'>;
type RingingRoute = RouteProp<RootStackParamList, 'Ringing'>;

const VOICE_THRESHOLD = 0.8;
const MAX_VOICE_RETRIES = 5;
const SNOOZE_MINUTES = 5;
const MAX_SNOOZE = 2;
const VOCAB_PASS_PERCENT = 80;

export default function RingingScreen() {
  const navigation = useNavigation<RingingNav>();
  const route = useRoute<RingingRoute>();

  const { alarmId, snoozeCount: paramSnoozeCount } = route.params;
  const snoozeCount = paramSnoozeCount ?? 0;
  const { alarms, settings, clearRinging, updateSetting, addCoins } = useAppStore();

  const alarm = alarms.find((a) => a.id === alarmId);
  const [sentence, setSentence] = useState<Sentence | null>(null);
  const speechAvailable = isSpeechRecognitionAvailable();
  const [mode, setMode] = useState<UnlockMode>(speechAvailable ? 'voice' : 'typing');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceRetries, setVoiceRetries] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [typedText, setTypedText] = useState('');
  const [typingError, setTypingError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [spokenText, setSpokenText] = useState('');

  // Smart Recording: track successful readings
  const [successfulReadings, setSuccessfulReadings] = useState(0);
  const requiredReadings = snoozeCount + 1; // 1st time: 1, after 1st snooze: 2, after 2nd: 3

  const [levelUpInfo, setLevelUpInfo] = useState<{ level: number } | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [triggerReviewQuiz, setTriggerReviewQuiz] = useState(false);
  const levelUpAnim = useRef(new Animated.Value(0)).current;
  const vibrationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Vocab alarm quiz (tomorrow set, due today)
  const [vocabQuizDue, setVocabQuizDue] = useState<{ words: VocabItem[] } | null>(null);
  const [vocabQuizVisible, setVocabQuizVisible] = useState(false);
  const [vocabQuizItems, setVocabQuizItems] = useState<Array<{ word: string; options: string[]; correctIndex: number }>>([]);
  const [vocabIndex, setVocabIndex] = useState(0);
  const [vocabAnswers, setVocabAnswers] = useState<(number | null)[]>([]);
  const [vocabSelected, setVocabSelected] = useState<number | null>(null);
  const [vocabPassed, setVocabPassed] = useState(false);
  const [vocabResult, setVocabResult] = useState<{ correct: number; total: number; pct: number } | null>(null);

  useEffect(() => {
    loadSentence();
    loadVocabQuizDue();
    startVibration();
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => {
      backHandler.remove();
      stopVibration();
      stopRepeating();
      stopListening();
    };
  }, []);

  useEffect(() => {
    if (sentence) {
      setTimeout(() => {
        startRepeating(sentence.text, sentence.meaning_ko);
      }, 500);
    }
    return () => { stopRepeating(); };
  }, [sentence]);

  useEffect(() => {
    if (!speechAvailable) return;
    setSpeechCallbacks(
      (spoken: string) => { handleVoiceResult(spoken); },
      (_error: string) => {
        setVoiceState('fail');
        setSpokenText('');
        setLastScore(null);
      },
    );
  }, [sentence, voiceRetries, successfulReadings]);

  const loadSentence = async () => {
    const daily = await getOrCreateDailySentences(settings);
    const picked = pickOneFromDaily(daily);
    if (picked) {
      setSentence(picked);
      return;
    }
    const { user_level, selected_packs } = settings;
    const s = await fetchAdaptiveSentence(user_level, selected_packs);
    setSentence(s);
  };

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const loadVocabQuizDue = async () => {
    const due = await getDueVocabQuizForToday();
    if (!due) {
      setVocabQuizDue(null);
      setVocabQuizVisible(false);
      return;
    }
    setVocabQuizDue({ words: due.words });
    // Initialize quiz items
    const meaningPool = due.words.map((w) => w.meaning_ko);
    const items = due.words.map((w) => {
      const wrongs = meaningPool.filter((m) => m !== w.meaning_ko);
      const threeWrong = shuffle(wrongs).slice(0, 3);
      const options = shuffle([w.meaning_ko, ...threeWrong]);
      const correctIndex = options.indexOf(w.meaning_ko);
      return { word: w.word, options, correctIndex };
    });
    setVocabQuizItems(items);
    setVocabIndex(0);
    setVocabAnswers(new Array(items.length).fill(null));
    setVocabSelected(null);
    setVocabPassed(false);
    setVocabResult(null);
    setVocabQuizVisible(true);
  };

  const handleVocabSelect = (optionIndex: number) => {
    if (vocabSelected !== null) return;
    const current = vocabQuizItems[vocabIndex];
    if (!current) return;
    setVocabSelected(optionIndex);
    const nextAnswers = [...vocabAnswers];
    nextAnswers[vocabIndex] = optionIndex;
    setVocabAnswers(nextAnswers);

    setTimeout(async () => {
      if (vocabIndex < vocabQuizItems.length - 1) {
        setVocabIndex(vocabIndex + 1);
        setVocabSelected(null);
      } else {
        const correct = nextAnswers.filter((a, i) => a === vocabQuizItems[i].correctIndex).length;
        const total = vocabQuizItems.length;
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
        const passed = pct >= VOCAB_PASS_PERCENT;
        setVocabPassed(passed);
        setVocabResult({ correct, total, pct });
        if (passed) {
          await markVocabQuizPassedToday();
          setVocabQuizVisible(false);
        }
      }
    }, 450);
  };

  const handleVocabRetry = () => {
    if (!vocabQuizDue) return;
    // reshuffle options for variety
    const meaningPool = vocabQuizDue.words.map((w) => w.meaning_ko);
    const items = vocabQuizDue.words.map((w) => {
      const wrongs = meaningPool.filter((m) => m !== w.meaning_ko);
      const threeWrong = shuffle(wrongs).slice(0, 3);
      const options = shuffle([w.meaning_ko, ...threeWrong]);
      const correctIndex = options.indexOf(w.meaning_ko);
      return { word: w.word, options, correctIndex };
    });
    setVocabQuizItems(items);
    setVocabIndex(0);
    setVocabAnswers(new Array(items.length).fill(null));
    setVocabSelected(null);
    setVocabPassed(false);
    setVocabResult(null);
    setVocabQuizVisible(true);
  };

  const startVibration = () => { Vibration.vibrate([0, 500, 500], true); };
  const stopVibration = () => { Vibration.cancel(); };

  const handleReplay = () => {
    if (sentence) {
      stopRepeating();
      startRepeating(sentence.text, sentence.meaning_ko);
    }
  };

  const handleStartListening = async () => {
    if (!sentence) return;
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
    setTimeout(async () => {
      if (result.success) {
        setVoiceState('success');
        const wasFirstSuccess = !(await hadSuccessBefore(sentence!.id));
        recordAttempt(sentence!.id, true, result.score);
        if (wasFirstSuccess) {
          const { shouldTriggerQuiz } = await addNewLearnedSentence(sentence!.id);
          setTriggerReviewQuiz(shouldTriggerQuiz);
        }
        handleSuccessfulReading();
      } else {
        setVoiceState('fail');
        recordAttempt(sentence.id, false, result.score);
        incrementTotalAttempts();
        handleVoiceFail();
      }
    }, 500);
  };

  const handleVoiceFail = () => {
    const newRetries = voiceRetries + 1;
    setVoiceRetries(newRetries);
    if (newRetries >= MAX_VOICE_RETRIES) {
      setMode('typing');
      setVoiceState('idle');
    }
  };

  const handleRetry = () => {
    setVoiceState('idle');
    setSpokenText('');
    setLastScore(null);
    if (sentence) { startRepeating(sentence.text, sentence.meaning_ko); }
  };

  const handleTypingSubmit = async () => {
    if (!sentence || typedText.trim().length === 0) return;
    Keyboard.dismiss();
    const result = checkTypingMatch(sentence.text, typedText);
    setLastScore(Math.round(result.score * 100));
    if (result.success) {
      const wasFirstSuccess = !(await hadSuccessBefore(sentence.id));
      recordAttempt(sentence.id, true, result.score);
      if (wasFirstSuccess) {
        const { shouldTriggerQuiz } = await addNewLearnedSentence(sentence.id);
        setTriggerReviewQuiz(shouldTriggerQuiz);
      }
      handleSuccessfulReading();
    } else {
      recordAttempt(sentence.id, false, result.score);
      incrementTotalAttempts();
      setTypingError(true);
      setTypedText('');
      setTimeout(() => {
        setTypingError(false);
        setLastScore(null);
      }, 2000);
    }
  };

  const grantXPForReading = async (difficulty: number) => {
    const xpAmount = 10 * difficulty;
    await incrementTotalCorrect();
    await incrementTotalAttempts();
    const { newXP, oldLevel, newLevel } = await addXP(xpAmount);
    await updateSetting('user_xp', newXP.toString());
    await addCoins(xpAmount);

    if (newLevel > oldLevel) {
      await updateSetting('user_level', newLevel.toString());
      await unlockBadge('level_up');
      if (newLevel >= 8) await unlockBadge('level_max');
      setLevelUpInfo({ level: newLevel });
      Animated.spring(levelUpAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }).start();
    }
  };

  // Smart Recording: handle a successful reading
  const handleSuccessfulReading = async () => {
    const newCount = successfulReadings + 1;
    setSuccessfulReadings(newCount);

    if (sentence) {
      await grantXPForReading(sentence.difficulty);
    }

    if (newCount >= requiredReadings) {
      handleUnlock();
    } else {
      setTimeout(() => {
        setVoiceState('idle');
        setVoiceRetries(0);
        setLastScore(null);
        setSpokenText('');
        setTypedText('');
        loadSentence();
      }, 1000);
    }
  };

  const checkAndUnlockBadges = async (hadPerfectScore: boolean) => {
    const earned: string[] = [];

    const streak = await getCurrentStreak();
    if (streak >= 3 && await unlockBadge('streak_3')) earned.push('streak_3');
    if (streak >= 7 && await unlockBadge('streak_7')) earned.push('streak_7');
    if (streak >= 30 && await unlockBadge('streak_30')) earned.push('streak_30');

    const totalCorrect = await getTotalCorrect();
    if (totalCorrect >= 10 && await unlockBadge('sentences_10')) earned.push('sentences_10');
    if (totalCorrect >= 50 && await unlockBadge('sentences_50')) earned.push('sentences_50');
    if (totalCorrect >= 100 && await unlockBadge('sentences_100')) earned.push('sentences_100');

    if (hadPerfectScore && await unlockBadge('perfect')) earned.push('perfect');

    const packs = await getUsedPacks();
    if (packs.length >= 5 && await unlockBadge('all_packs')) earned.push('all_packs');

    if (earned.length > 0) setNewBadges(earned);
  };

  const handleUnlock = async () => {
    // If vocab quiz is due, block unlock until passed
    if (vocabQuizDue && !vocabPassed) {
      setVocabQuizVisible(true);
      return;
    }
    setUnlocked(true);
    stopVibration();
    stopRepeating();
    stopListening();

    if (sentence) {
      const today = new Date().toISOString().split('T')[0];
      await recordStreak(today, sentence.text);
    }

    const hadPerfect = lastScore !== null && lastScore >= 100;
    await checkAndUnlockBadges(hadPerfect);

    setTimeout(() => {
      clearRinging();
      if (triggerReviewQuiz) {
        navigation.reset({ index: 0, routes: [{ name: 'ReviewQuiz' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }
    }, 2500);
  };

  const handleSnooze = async () => {
    if (!alarm || snoozeCount >= MAX_SNOOZE) return;

    // Must complete required readings before snoozing
    if (successfulReadings < requiredReadings) return;

    stopVibration();
    stopRepeating();
    stopListening();
    const snoozeDate = new Date();
    snoozeDate.setMinutes(snoozeDate.getMinutes() + SNOOZE_MINUTES);
    const snoozeAlarm = {
      ...alarm,
      hour: snoozeDate.getHours(),
      minute: snoozeDate.getMinutes(),
      repeat_mask: 0,
    };
    await scheduleAlarm(snoozeAlarm);
    clearRinging();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const [emergencyTaps, setEmergencyTaps] = useState(0);
  const handleEmergencyTap = () => {
    const taps = emergencyTaps + 1;
    setEmergencyTaps(taps);
    if (taps >= 7) handleUnlock();
  };

  const now = new Date();
  const timeStr = formatTime12(now.getHours(), now.getMinutes());
  const readingsLeft = Math.max(0, requiredReadings - successfulReadings);
  const canDismiss = successfulReadings >= requiredReadings;

  if (unlocked) {
    return (
      <View style={styles.gradient}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successText}>잘했어요!</Text>
          <Text style={styles.successSubtext}>알람이 해제되었습니다</Text>
          {snoozeCount > 0 && (
            <Text style={styles.successExtra}>
              총 {snoozeCount + 1}회 읽기 완료!
            </Text>
          )}
          {sentence && (
            <Text style={styles.xpGainText}>
              +{10 * sentence.difficulty} XP 획득!
            </Text>
          )}
          {newBadges.length > 0 && (
            <View style={styles.badgeToast}>
              {newBadges.map((bId) => {
                const badge = BADGES.find((b) => b.id === bId);
                return badge ? (
                  <View key={bId} style={styles.badgeToastItem}>
                    <Text style={styles.badgeToastEmoji}>{badge.emoji}</Text>
                    <Text style={styles.badgeToastText}>{badge.name} 획득!</Text>
                  </View>
                ) : null;
              })}
            </View>
          )}
        </View>

        {/* Level Up Modal */}
        {levelUpInfo && (
          <Modal transparent animationType="fade" visible={!!levelUpInfo}>
            <View style={styles.levelUpOverlay}>
              <Animated.View
                style={[
                  styles.levelUpCard,
                  { transform: [{ scale: levelUpAnim }] },
                ]}
              >
                <Text style={styles.levelUpEmoji}>{getLevelEmoji(levelUpInfo.level)}</Text>
                <Text style={styles.levelUpTitle}>레벨 업!</Text>
                <Text style={styles.levelUpLevel}>
                  Lv.{levelUpInfo.level} {getLevelLabel(levelUpInfo.level)}
                </Text>
                <Text style={styles.levelUpDesc}>축하해요! 레벨이 올랐어요!</Text>
                <TouchableOpacity
                  style={styles.levelUpBtn}
                  onPress={() => setLevelUpInfo(null)}
                >
                  <Text style={styles.levelUpBtnText}>확인</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Modal>
        )}
      </View>
    );
  }

  return (
    <View style={styles.gradient}>
      <View style={styles.container}>
        {/* Vocab Quiz Modal (blocks alarm dismiss) */}
        {vocabQuizDue && (
          <Modal transparent animationType="fade" visible={vocabQuizVisible}>
            <View style={styles.vocabOverlay}>
              <View style={styles.vocabCard}>
                {!vocabResult ? (
                  <>
                    <Text style={styles.vocabTitle}>🔔 단어 퀴즈</Text>
                    <Text style={styles.vocabSub}>
                      {vocabIndex + 1} / {vocabQuizItems.length} · 80% 이상 맞추면 알람이 꺼져요
                    </Text>
                    <View style={styles.vocabQuestionCard}>
                      <Text style={styles.vocabQuestionWord}>
                        {vocabQuizItems[vocabIndex]?.word ?? ''}
                      </Text>
                      <Text style={styles.vocabQuestionHint}>뜻을 고르세요</Text>
                    </View>
                    <View style={styles.vocabOptions}>
                      {(vocabQuizItems[vocabIndex]?.options ?? []).map((opt, i) => {
                        const current = vocabQuizItems[vocabIndex];
                        const chosen = vocabSelected !== null;
                        const isCorrect = current && i === current.correctIndex;
                        const isChosen = vocabSelected === i;
                        const showCorrect = chosen && isCorrect;
                        const showWrong = chosen && isChosen && !isCorrect;
                        return (
                          <TouchableOpacity
                            key={i}
                            style={[
                              styles.vocabOptionBtn,
                              showCorrect && styles.vocabOptionCorrect,
                              showWrong && styles.vocabOptionWrong,
                            ]}
                            onPress={() => handleVocabSelect(i)}
                            disabled={chosen}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.vocabOptionText}>{opt}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.vocabTitle}>
                      {vocabResult.pct >= VOCAB_PASS_PERCENT ? '🎉 통과!' : '💪 다시 도전!'}
                    </Text>
                    <Text style={styles.vocabSub}>
                      {vocabResult.correct}/{vocabResult.total} 맞음 ({vocabResult.pct}%) · 목표 {VOCAB_PASS_PERCENT}%+
                    </Text>
                    {vocabResult.pct < VOCAB_PASS_PERCENT ? (
                      <TouchableOpacity style={styles.vocabPrimaryBtn} onPress={handleVocabRetry}>
                        <Text style={styles.vocabPrimaryBtnText}>다시 풀기</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.vocabPrimaryBtn}
                        onPress={() => setVocabQuizVisible(false)}
                      >
                        <Text style={styles.vocabPrimaryBtnText}>계속</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
          </Modal>
        )}

        {/* Header */}
        <Text style={styles.headerLabel}>
          {snoozeCount === 0 ? '기상 알람 ☀️' : `${snoozeCount}차 미루기 알람 ⏰`}
        </Text>

        {/* Time */}
        <TouchableOpacity
          style={styles.timeArea}
          onPress={handleEmergencyTap}
          activeOpacity={1}
        >
          <Text style={styles.time}>{timeStr}</Text>
          {alarm?.label ? <Text style={styles.label}>{alarm.label}</Text> : null}
        </TouchableOpacity>

        {/* Progress Badge */}
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>
            📖 {successfulReadings}/{requiredReadings}회 읽기
          </Text>
          <View style={styles.progressDots}>
            {Array.from({ length: requiredReadings }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < successfulReadings && styles.dotFilled,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Sentence Card */}
        <View style={styles.sentenceCard}>
          {sentence && (
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>
                {sentence.difficulty === 1 ? '🌱 초급' : sentence.difficulty === 2 ? '🌿 중급' : '🌳 고급'}
              </Text>
            </View>
          )}
          <Text style={styles.sentenceLabel}>
            {readingsLeft > 0
              ? `이 문장을 따라 읽으세요 (${readingsLeft}회 남음)`
              : '✅ 모든 읽기 완료!'}
          </Text>
          <Text style={styles.sentence}>"{sentence?.text ?? '...'}"</Text>
          <Text style={styles.meaningKo}>{sentence?.meaning_ko ?? ''}</Text>
          <TouchableOpacity onPress={handleReplay} style={styles.replayBtn}>
            <Text style={styles.replayText}>🔊 다시 듣기</Text>
          </TouchableOpacity>
        </View>

        {/* Unlock Area - only show if still need readings */}
        {!canDismiss && (
          <View style={styles.unlockArea}>
            {mode === 'voice' ? (
              <View style={styles.voiceArea}>
                <VoiceIndicator state={voiceState} />

                {lastScore !== null && (
                  <View style={styles.scoreContainer}>
                    <Text style={[
                      styles.scoreText,
                      { color: lastScore >= VOICE_THRESHOLD * 100 ? colors.success : colors.error },
                    ]}>
                      정확도: {lastScore}%
                    </Text>
                    <View style={styles.scoreBarBg}>
                      <View
                        style={[
                          styles.scoreBarFill,
                          {
                            width: `${lastScore}%`,
                            backgroundColor: lastScore >= VOICE_THRESHOLD * 100 ? colors.success : colors.error,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {spokenText ? (
                  <Text style={styles.spokenText}>인식된 음성: "{spokenText}"</Text>
                ) : null}

                {voiceState === 'idle' && (
                  <TouchableOpacity style={styles.speakBtn} onPress={handleStartListening}>
                    <Text style={styles.speakBtnText}>🎤 탭하고 말하기</Text>
                  </TouchableOpacity>
                )}

                {voiceState === 'fail' && (
                  <View style={styles.failActions}>
                    <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                      <Text style={styles.retryBtnText}>
                        다시 시도 ({MAX_VOICE_RETRIES - voiceRetries}회 남음)
                      </Text>
                    </TouchableOpacity>
                    {voiceRetries >= 3 && (
                      <TouchableOpacity style={styles.switchBtn} onPress={() => setMode('typing')}>
                        <Text style={styles.switchBtnText}>타이핑으로 전환</Text>
                      </TouchableOpacity>
                    )}
                  </View>
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
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleTypingSubmit}
                />
                <TouchableOpacity
                  style={[styles.submitBtn, typedText.length === 0 && styles.submitBtnDisabled]}
                  onPress={handleTypingSubmit}
                  disabled={typedText.length === 0}
                >
                  <Text style={styles.submitBtnText}>제출</Text>
                </TouchableOpacity>
                {typingError && <Text style={styles.errorText}>정확하지 않아요. 다시 시도해보세요!</Text>}
                {speechAvailable && (
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
                )}
              </View>
            )}
          </View>
        )}

        {/* Bottom buttons - show after completing readings */}
        {canDismiss && (
          <View style={styles.bottomArea}>
            <Text style={styles.completeText}>
              ✅ 읽기 완료! {vocabQuizDue && !vocabPassed ? '단어 퀴즈를 풀어야 해요' : '어떻게 할까요?'}
            </Text>

            {/* Dismiss button */}
            <TouchableOpacity style={styles.dismissBtn} onPress={handleUnlock}>
              <Text style={styles.dismissBtnText}>알람 끄기</Text>
            </TouchableOpacity>

            {/* Snooze button - only if not maxed out */}
            {snoozeCount < MAX_SNOOZE && (
              <TouchableOpacity style={styles.snoozeActionBtn} onPress={handleSnooze}>
                <Text style={styles.snoozeActionText}>
                  😴 {SNOOZE_MINUTES}분 더 잘래요 ({snoozeCount + 1}차 미루기)
                </Text>
                <Text style={styles.snoozePenalty}>
                  다음엔 {snoozeCount + 2}회 읽기가 필요해요
                </Text>
              </TouchableOpacity>
            )}

            {snoozeCount >= MAX_SNOOZE && (
              <Text style={styles.maxSnoozeText}>
                미루기 {MAX_SNOOZE}회 달성! 더 이상 미룰 수 없어요 💪
              </Text>
            )}
          </View>
        )}

        {/* Instructions */}
        {!canDismiss && (
          <View style={styles.instructionArea}>
            <Text style={styles.instructionText}>
              {snoozeCount === 0
                ? '1회 따라읽기 → 알람 종료'
                : `${snoozeCount}차 미루기: ${requiredReadings}회 읽기 필요`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: colors.ringGrad1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },
  successContainer: {
    flex: 1,
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
    color: colors.white,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
  },
  successExtra: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 4,
  },
  timeArea: {
    alignItems: 'center',
    marginBottom: 12,
  },
  time: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 2,
  },
  label: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Progress Badge
  progressBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 6,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  dotFilled: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },

  // Sentence Card
  sentenceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    ...shadows.cardHover,
  },
  difficultyBadge: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  sentenceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  sentence: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 6,
  },
  meaningKo: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  replayBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
  },
  replayText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },

  // Unlock area
  unlockArea: {
    flex: 1,
    justifyContent: 'center',
  },
  voiceArea: {
    alignItems: 'center',
    gap: 12,
  },
  speakBtn: {
    backgroundColor: colors.white,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: borderRadius.full,
    ...shadows.card,
  },
  speakBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  scoreContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  scoreText: {
    fontSize: 17,
    fontWeight: '700',
  },
  scoreBarBg: {
    width: '80%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  failActions: {
    gap: 10,
    alignItems: 'center',
  },
  retryBtn: {
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: borderRadius.full,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  switchBtn: {
    paddingVertical: 8,
  },
  switchBtnText: {
    fontSize: 14,
    color: colors.white,
    textDecorationLine: 'underline',
  },
  spokenText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  typingArea: {
    alignItems: 'center',
    gap: 12,
  },
  typingLabel: {
    fontSize: 15,
    color: colors.white,
    fontWeight: '600',
  },
  typingInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: 14,
    fontSize: 17,
    color: colors.textPrimary,
    width: '100%',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typingInputError: {
    borderColor: colors.error,
  },
  submitBtn: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 44,
    borderRadius: borderRadius.full,
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  errorText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '500',
  },

  // Bottom area (after completing readings)
  bottomArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  completeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
  },
  dismissBtn: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    ...shadows.card,
    width: '100%',
  },
  dismissBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  snoozeActionBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    width: '100%',
  },
  snoozeActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 4,
  },
  snoozePenalty: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  maxSnoozeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 8,
  },

  // Instructions
  instructionArea: {
    alignItems: 'center',
    marginTop: 8,
  },
  instructionText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Badge toast
  badgeToast: {
    marginTop: 16,
    gap: 8,
  },
  badgeToastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.full,
    gap: 8,
  },
  badgeToastEmoji: {
    fontSize: 20,
  },
  badgeToastText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },

  // XP gain
  xpGainText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.warning,
    marginTop: 12,
  },

  // Level Up Modal
  levelUpOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelUpCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: 36,
    alignItems: 'center',
    width: '80%',
    ...shadows.cardHover,
  },
  levelUpEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  levelUpTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  levelUpLevel: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  levelUpDesc: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  levelUpBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: borderRadius.full,
  },
  levelUpBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },

  // Vocab quiz modal
  vocabOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  vocabCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: 20,
    ...shadows.cardHover,
  },
  vocabTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  vocabSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  vocabQuestionCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.xl,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  vocabQuestionWord: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: 6,
  },
  vocabQuestionHint: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  vocabOptions: {
    gap: 10,
    marginBottom: 6,
  },
  vocabOptionBtn: {
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  vocabOptionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  vocabOptionWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  vocabOptionText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  vocabPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  vocabPrimaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },
});
