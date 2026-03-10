import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, shadows, borderRadius } from '../theme';
import { getLevelLabel, getLevelEmoji, getLevelDesc, XP_THRESHOLDS } from '../data/badges';
import { setProgressValue } from '../db/progressRepo';
import { grantCoinsOnSuccess } from '../services/coinService';
import questionBank from '../data/levelTestQuestions.json';
import { LevelTestQuestion } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'LevelTest'>;

const allQuestions = questionBank as LevelTestQuestion[];

interface PreparedQuestion extends LevelTestQuestion {
  shuffledOptions: string[];
  correctIndex: number;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandomQuestions(): PreparedQuestion[] {
  const selected: PreparedQuestion[] = [];
  for (let d = 1; d <= 5; d++) {
    const pool = allQuestions.filter((q) => q.difficulty === d);
    const picked = shuffleArray(pool).slice(0, 2);
    picked.forEach((q) => {
      const shuffled = shuffleArray(q.options);
      selected.push({
        ...q,
        shuffledOptions: shuffled,
        correctIndex: shuffled.indexOf(q.correct_answer),
      });
    });
  }
  return selected;
}

const TOTAL_QUESTIONS = 10;

export default function LevelTestScreen() {
  const navigation = useNavigation<Nav>();
  const { updateSetting } = useAppStore();

  const [phase, setPhase] = useState<'welcome' | 'quiz' | 'result'>('welcome');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<PreparedQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(TOTAL_QUESTIONS).fill(null)
  );
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [resultLevel, setResultLevel] = useState(1);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentQuestion = quizQuestions[currentIndex];

  const animateTransition = (callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleOptionSelect = (optionIndex: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIndex);

    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentIndex < TOTAL_QUESTIONS - 1) {
        animateTransition(() => {
          setCurrentIndex(currentIndex + 1);
          setSelectedOption(null);
        });
      } else {
        const level = calculateLevel(newAnswers);
        setResultLevel(level);
        animateTransition(() => setPhase('result'));
      }
    }, 600);
  };

  const calculateLevel = (ans: (number | null)[]): number => {
    let weightedScore = 0;
    quizQuestions.forEach((q, i) => {
      if (ans[i] === q.correctIndex) {
        weightedScore += q.difficulty;
      }
    });
    // Max possible: 2*(1+2+3+4+5) = 30
    if (weightedScore <= 3) return 1;
    if (weightedScore <= 6) return 2;
    if (weightedScore <= 10) return 3;
    if (weightedScore <= 14) return 4;
    if (weightedScore <= 18) return 5;
    if (weightedScore <= 22) return 6;
    if (weightedScore <= 26) return 7;
    return 8;
  };

  const handleStart = () => {
    const picked = pickRandomQuestions();
    setQuizQuestions(picked);
    setAnswers(new Array(TOTAL_QUESTIONS).fill(null));
    setCurrentIndex(0);
    setSelectedOption(null);
    animateTransition(() => setPhase('quiz'));
  };

  const handleFinish = async () => {
    await updateSetting('test_completed', 'true');
    await updateSetting('user_level', resultLevel.toString());
    const initialXP = XP_THRESHOLDS[Math.max(0, resultLevel - 1)];
    await updateSetting('user_xp', initialXP.toString());
    await setProgressValue('xp', initialXP.toString());
    await grantCoinsOnSuccess(initialXP);
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  if (phase === 'welcome') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Animated.View style={[styles.centerContent, { opacity: fadeAnim }]}>
          <Text style={styles.welcomeEmoji}>📝</Text>
          <Text style={styles.welcomeTitle}>영어 실력 테스트</Text>
          <Text style={styles.welcomeDesc}>
            10개의 영어 회화 문제로{'\n'}나의 영어 레벨을 측정해 볼게요!
          </Text>
          <Text style={styles.welcomeHint}>
            실제 원어민 표현의 뜻 맞추기 +{'\n'}
            빈칸에 올바른 단어 넣기로 구성돼요{'\n'}
            모르는 문제는 감으로 골라도 괜찮아요
          </Text>
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Text style={styles.startBtnText}>테스트 시작</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  if (phase === 'result') {
    const emoji = getLevelEmoji(resultLevel);
    const label = getLevelLabel(resultLevel);
    const totalCorrect = answers.filter(
      (a, i) => a === quizQuestions[i]?.correctIndex
    ).length;

    const diffLabels = ['', '매우 쉬움', '쉬움', '보통', '어려움', '매우 어려움'];
    const breakdown: { diff: number; correct: number; total: number }[] = [];
    for (let d = 1; d <= 5; d++) {
      const indices = quizQuestions
        .map((q, i) => (q.difficulty === d ? i : -1))
        .filter((i) => i >= 0);
      const correct = indices.filter((i) => answers[i] === quizQuestions[i].correctIndex).length;
      breakdown.push({ diff: d, correct, total: indices.length });
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.resultScrollContent}>
        <StatusBar barStyle="dark-content" />
        <Animated.View style={[styles.resultContent, { opacity: fadeAnim }]}>
          <Text style={styles.resultEmoji}>{emoji}</Text>
          <Text style={styles.resultTitle}>{label}</Text>

          {/* Score summary */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreNumber}>{totalCorrect}</Text>
              <Text style={styles.scoreLabel}>정답</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={styles.scoreNumber}>{TOTAL_QUESTIONS - totalCorrect}</Text>
              <Text style={styles.scoreLabel}>오답</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreNumber, { color: colors.primary }]}>
                {Math.round((totalCorrect / TOTAL_QUESTIONS) * 100)}%
              </Text>
              <Text style={styles.scoreLabel}>정답률</Text>
            </View>
          </View>

          {/* Per-difficulty breakdown */}
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>난이도별 결과</Text>
            {breakdown.map((b) => (
              <View key={b.diff} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{diffLabels[b.diff]}</Text>
                <View style={styles.breakdownBarBg}>
                  <View
                    style={[
                      styles.breakdownBarFill,
                      {
                        width: `${(b.correct / b.total) * 100}%`,
                        backgroundColor: b.correct === b.total
                          ? colors.success
                          : b.correct > 0
                          ? colors.warning
                          : colors.error,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.breakdownScore}>{b.correct}/{b.total}</Text>
              </View>
            ))}
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>측정된 나의 영어 레벨</Text>
            <View style={styles.levelResultRow}>
              <Text style={styles.levelResultEmoji}>{emoji}</Text>
              <View>
                <Text style={styles.levelResultLevel}>{label}</Text>
                <Text style={styles.levelResultLabel}>Lv.{resultLevel}</Text>
              </View>
            </View>
            <Text style={styles.resultCardDesc}>
              {getLevelDesc(resultLevel)}
            </Text>
          </View>

          <Text style={styles.resultHint}>
            매일 알람을 해제하면서 자동으로 레벨이 조절돼요
          </Text>

          <TouchableOpacity style={styles.startBtn} onPress={handleFinish}>
            <Text style={styles.startBtnText}>시작하기</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    );
  }

  // Quiz phase
  if (!currentQuestion) return null;

  const progress = (currentIndex + 1) / TOTAL_QUESTIONS;
  const isCorrect = selectedOption === currentQuestion.correctIndex;
  const difficultyLabel = ['', '매우 쉬움', '쉬움', '보통', '어려움', '매우 어려움'][
    currentQuestion.difficulty
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.quizHeader}>
        <Text style={styles.questionCount}>
          {currentIndex + 1} / {TOTAL_QUESTIONS}
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.difficultyLabel}>{difficultyLabel}</Text>
      </View>

      <Animated.View style={[styles.quizContent, { opacity: fadeAnim }]}>
        <View style={styles.questionCard}>
          <View style={styles.questionTypeBadge}>
            <Text style={styles.questionTypeText}>
              {currentQuestion.type === 'meaning' ? '💬 뜻 맞추기' : '✏️ 단어 넣기'}
            </Text>
          </View>
          <Text style={styles.sentenceText}>{currentQuestion.sentence}</Text>
          <Text style={styles.questionText}>{currentQuestion.question_ko}</Text>
        </View>

        <View style={styles.optionsContainer}>
          {currentQuestion.shuffledOptions.map((option, i) => {
            let optionStyle = styles.optionBtn;
            let textStyle = styles.optionText;

            if (selectedOption !== null) {
              if (i === currentQuestion.correctIndex) {
                optionStyle = { ...styles.optionBtn, ...styles.optionCorrect };
                textStyle = { ...styles.optionText, ...styles.optionTextCorrect };
              } else if (i === selectedOption && !isCorrect) {
                optionStyle = { ...styles.optionBtn, ...styles.optionWrong };
                textStyle = { ...styles.optionText, ...styles.optionTextWrong };
              }
            }

            return (
              <TouchableOpacity
                key={i}
                style={optionStyle}
                onPress={() => handleOptionSelect(i)}
                disabled={selectedOption !== null}
                activeOpacity={0.7}
              >
                <Text style={styles.optionNumber}>{String.fromCharCode(65 + i)}</Text>
                <Text style={textStyle}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 56,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // Welcome
  welcomeEmoji: { fontSize: 64, marginBottom: 20 },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  welcomeDesc: {
    fontSize: 17,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 20,
  },
  welcomeHint: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  startBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: borderRadius.full,
    ...shadows.fab,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },

  // Result
  resultScrollContent: {
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  resultContent: {
    width: '100%',
    alignItems: 'center',
  },
  resultEmoji: { fontSize: 72, marginBottom: 12 },
  resultTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: 20,
    width: '100%',
    marginBottom: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    ...shadows.card,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  scoreDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  breakdownCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: 20,
    width: '100%',
    ...shadows.card,
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    width: 72,
  },
  breakdownBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownScore: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    width: 30,
    textAlign: 'right',
  },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: 20,
    width: '100%',
    ...shadows.card,
    marginBottom: 16,
  },
  resultCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  levelResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  levelResultEmoji: {
    fontSize: 40,
  },
  levelResultLevel: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  levelResultLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  resultCardDesc: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  resultHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },

  // Quiz header
  quizHeader: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  questionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  difficultyLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Quiz content
  quizContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: 24,
    marginBottom: 24,
    ...shadows.card,
  },
  questionTypeBadge: {
    backgroundColor: colors.primaryLight,
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    marginBottom: 14,
  },
  questionTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  sentenceText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 32,
    marginBottom: 12,
    textAlign: 'center',
  },
  questionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },

  // Options
  optionsContainer: {
    gap: 12,
  },
  optionBtn: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.card,
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  optionWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  optionNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
    marginRight: 12,
    width: 24,
  },
  optionText: {
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
  },
  optionTextCorrect: {
    color: colors.success,
    fontWeight: '600',
  },
  optionTextWrong: {
    color: colors.error,
  },
});
