import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, shadows, borderRadius } from '../theme';
import { getLevelLabel, getLevelEmoji, getLevelWithSubLabel } from '../data/badges';
import { Sentence } from '../types';
import {
  getCycleLearnedIds,
  getLearnedSentenceIds,
  resetLearningCycle,
} from '../db/progressRepo';
import { getSentencesByIds } from '../db/sentenceRepo';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ReviewQuiz'>;

interface QuizItem {
  sentence: Sentence;
  options: string[];
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

const PASS_PERCENT = 70;

export default function ReviewQuizScreen() {
  const navigation = useNavigation<Nav>();
  const { settings, updateSetting, loadSettings } = useAppStore();

  const [phase, setPhase] = useState<'loading' | 'quiz' | 'result'>('loading');
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [passed, setPassed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    const cycleIds = await getCycleLearnedIds();
    if (cycleIds.length < 4) {
      await resetLearningCycle();
      setPhase('result');
      setPassed(false);
      setQuizItems([]);
      return;
    }
    const cycleSentences = await getSentencesByIds(cycleIds);
    const moreIds = await getLearnedSentenceIds(30);
    const allIds = [...new Set([...cycleIds, ...moreIds])];
    const allSentences = await getSentencesByIds(allIds);
    const meaningPool = allSentences.map((s) => s.meaning_ko);

    const items: QuizItem[] = cycleSentences.slice(0, 5).map((sentence) => {
      const wrongs = meaningPool.filter((m) => m !== sentence.meaning_ko);
      const threeWrong = shuffleArray(wrongs).slice(0, 3);
      const options = shuffleArray([sentence.meaning_ko, ...threeWrong]);
      const correctIndex = options.indexOf(sentence.meaning_ko);
      return { sentence, options, correctIndex };
    });

    if (items.length === 0) {
      await resetLearningCycle();
      setPhase('result');
      setPassed(false);
      setQuizItems([]);
      return;
    }

    setQuizItems(items);
    setAnswers(new Array(items.length).fill(null));
    setPhase('quiz');
  };

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
    if (selectedOption !== null || !currentItem) return;
    setSelectedOption(optionIndex);
    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentIndex < quizItems.length - 1) {
        animateTransition(() => {
          setCurrentIndex(currentIndex + 1);
          setSelectedOption(null);
        });
      } else {
        const correct = newAnswers.filter((a, i) => a === quizItems[i].correctIndex).length;
        const pct = Math.round((correct / quizItems.length) * 100);
        setPassed(pct >= PASS_PERCENT);
        setPhase('result');
      }
    }, 600);
  };

  const handleResultClose = async () => {
    await resetLearningCycle();
    if (passed) {
      const nextSub = (settings.sub_level || 1) + 1;
      await updateSetting('sub_level', nextSub.toString());
      await loadSettings();
    }
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  if (phase === 'loading') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>복습 퀴즈 준비 중...</Text>
        </View>
      </View>
    );
  }

  if (phase === 'result') {
    const mainLevel = settings.user_level || 1;
    const subLevel = settings.sub_level || 1;
    const nextSub = subLevel + 1;
    const correctCount = quizItems.length > 0
      ? answers.filter((a, i) => a === quizItems[i].correctIndex).length
      : 0;
    const totalCount = quizItems.length;
    const pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.resultContent}>
          {quizItems.length === 0 ? (
            <>
              <Text style={styles.resultEmoji}>📚</Text>
              <Text style={styles.resultTitle}>아직 표현이 부족해요</Text>
              <Text style={styles.resultDesc}>
                새 표현 5개를 배우면 복습 퀴즈가 열려요.{'\n'}
                알람 해제할 때 새로운 문장을 만나보세요!
              </Text>
            </>
          ) : passed ? (
            <>
              <Text style={styles.resultEmoji}>🎉</Text>
              <Text style={styles.resultTitle}>복습 퀴즈 통과!</Text>
              <Text style={styles.levelUpText}>
                {getLevelWithSubLabel(mainLevel, nextSub)}
              </Text>
              <Text style={styles.resultDesc}>
                {correctCount}/{totalCount} 맞음 ({pct}%) · 서브 레벨이 올랐어요!
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.resultEmoji}>💪</Text>
              <Text style={styles.resultTitle}>다음에 다시 도전해요</Text>
              <Text style={styles.resultDesc}>
                {correctCount}/{totalCount} 맞음 ({pct}%) · 70% 이상 맞추면 레벨업!
              </Text>
            </>
          )}
          <TouchableOpacity style={styles.doneBtn} onPress={handleResultClose}>
            <Text style={styles.doneBtnText}>홈으로</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentItem = quizItems[currentIndex];
  if (!currentItem) return null;

  const progress = (currentIndex + 1) / quizItems.length;
  const isCorrect = selectedOption === currentItem.correctIndex;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.quizHeader}>
        <Text style={styles.questionCount}>
          {currentIndex + 1} / {quizItems.length}
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.quizLabel}>복습 퀴즈 · 70% 이상 통과 시 레벨업</Text>
      </View>

      <Animated.View style={[styles.quizContent, { opacity: fadeAnim }]}>
        <View style={styles.questionCard}>
          <Text style={styles.sentenceText}>{currentItem.sentence.text}</Text>
          <Text style={styles.questionText}>이 문장의 뜻은?</Text>
        </View>

        <View style={styles.optionsContainer}>
          {currentItem.options.map((option, i) => {
            let optionStyle = styles.optionBtn;
            let textStyle = styles.optionText;
            if (selectedOption !== null) {
              if (i === currentItem.correctIndex) {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
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
  quizLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
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
    textAlign: 'center',
  },
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
  resultContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  resultEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  levelUpText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
  },
  resultDesc: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: borderRadius.full,
    ...shadows.fab,
  },
  doneBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
});
