import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, shadows, borderRadius } from '../theme';
import { Sentence } from '../types';
import { getOrCreateDailySentences } from '../services/dailySentencesService';
import { getSentencesByIds, getSentencesByPacks, getSentenceIdsFromLastDays } from '../db/sentenceRepo';
import { speak, speakKorean, startRepeating, stopRepeating } from '../services/ttsService';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SentenceQuiz'>;
type Route = RouteProp<RootStackParamList, 'SentenceQuiz'>;

type HideMode = 'en' | 'ko'; // en = 한글만 보임(영어 가림), ko = 영어만 보임(한글 가림)

export type QuizQuestionType = 'en_to_ko' | 'ko_to_en' | 'fill_blank';

interface QuizItem {
  sentence: Sentence;
  options: string[];
  correctIndex: number;
  type: QuizQuestionType;
  /** fill_blank 유형일 때 빈칸이 포함된 문장 */
  blankedText?: string;
}

const QUIZ_TYPES: QuizQuestionType[] = ['en_to_ko', 'ko_to_en', 'fill_blank'];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandomType(): QuizQuestionType {
  return QUIZ_TYPES[Math.floor(Math.random() * QUIZ_TYPES.length)];
}

export default function SentenceQuizScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const mode = route.params?.mode ?? 'today';
  const { settings } = useAppStore();

  const [phase, setPhase] = useState<'loading' | 'learn' | 'quiz' | 'result'>('loading');
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [todaySentences, setTodaySentences] = useState<Sentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [hideMode, setHideMode] = useState<HideMode>('ko');
  const [revealed, setRevealed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadQuiz();
    return () => {
      stopRepeating();
    };
  }, [mode]);

  /**
   * 누적 퀴즈: 영어→한글, 한글→영어, 빈칸 채우기 등 다양한 유형으로 문항 생성.
   * @param sentences 출제할 10개 문장
   * @param meaningPool 한글 뜻 풀 (선택지용)
   * @param allSentences 전체 풀 문장 (오답용)
   */
  const buildQuizItems = (
    sentences: Sentence[],
    meaningPool: string[],
    allSentences: Sentence[]
  ): QuizItem[] => {
    const items: QuizItem[] = [];
    const enTexts = allSentences.map((s) => s.text);
    const allWords = allSentences.flatMap((s) =>
      s.text.split(/\s+/).filter((w) => w.length >= 2)
    );
    const uniqueWords = [...new Set(allWords)];

    for (const sentence of sentences) {
      const type = pickRandomType();

      if (type === 'en_to_ko') {
        const wrongs = meaningPool.filter((m) => m !== sentence.meaning_ko);
        const threeWrong = shuffleArray(wrongs).slice(0, 3);
        if (threeWrong.length < 3) continue;
        const options = shuffleArray([sentence.meaning_ko, ...threeWrong]);
        const correctIndex = options.indexOf(sentence.meaning_ko);
        items.push({ sentence, options, correctIndex, type });
        continue;
      }

      if (type === 'ko_to_en') {
        const wrongs = enTexts.filter((t) => t !== sentence.text);
        const threeWrong = shuffleArray(wrongs).slice(0, 3);
        if (threeWrong.length < 3) continue;
        const options = shuffleArray([sentence.text, ...threeWrong]);
        const correctIndex = options.indexOf(sentence.text);
        items.push({ sentence, options, correctIndex, type });
        continue;
      }

      if (type === 'fill_blank') {
        const words = sentence.text.split(/\s+/).filter((w) => w.length >= 3);
        if (words.length < 2) {
          const wrongs = meaningPool.filter((m) => m !== sentence.meaning_ko);
          const threeWrong = shuffleArray(wrongs).slice(0, 3);
          if (threeWrong.length < 3) continue;
          const options = shuffleArray([sentence.meaning_ko, ...threeWrong]);
          items.push({
            sentence,
            options,
            correctIndex: options.indexOf(sentence.meaning_ko),
            type: 'en_to_ko',
          });
          continue;
        }
        const correctWord = words[Math.floor(Math.random() * words.length)];
        const blankedText = sentence.text.replace(
          new RegExp(correctWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          '______'
        );
        const wrongWords = shuffleArray(
          uniqueWords.filter((w) => w !== correctWord && w.length >= 2)
        ).slice(0, 3);
        if (wrongWords.length < 3) continue;
        const options = shuffleArray([correctWord, ...wrongWords]);
        const correctIndex = options.indexOf(correctWord);
        items.push({
          sentence,
          options,
          correctIndex,
          type: 'fill_blank',
          blankedText,
        });
      }
    }
    return items;
  };

  const loadQuiz = async () => {
    const packs = settings.selected_packs?.length ? settings.selected_packs : ['morning_basics'];
    const poolSentences = await getSentencesByPacks(packs, 80);
    const meaningPool = [...new Set(poolSentences.map((s) => s.meaning_ko).filter(Boolean))];

    if (mode === 'today') {
      setTitle('오늘 문장 다시보기');
      const daily = await getOrCreateDailySentences(settings);
      if (daily.length === 0) {
        setPhase('result');
        setQuizItems([]);
        setTodaySentences([]);
        return;
      }
      setTodaySentences(daily);
      setCurrentIndex(0);
      setRevealed(false);
      setPhase('learn');
      return;
    }

    setTitle('누적 문장 퀴즈');
    const daily = await getOrCreateDailySentences(settings);
    const todayIds = daily.map((s) => s.id);
    const last8DaysIds = await getSentenceIdsFromLastDays(8);
    const poolIds = [...new Set([...todayIds, ...last8DaysIds])];
    if (poolIds.length === 0) {
      setPhase('result');
      setQuizItems([]);
      return;
    }
    const poolSentencesAll = await getSentencesByIds(poolIds);
    const cumulativeMeaningPool = [
      ...new Set(poolSentencesAll.map((s) => s.meaning_ko).filter(Boolean)),
    ];
    const shuffled = shuffleArray(poolSentencesAll).slice(0, 10);
    const items = buildQuizItems(shuffled, cumulativeMeaningPool, poolSentencesAll);
    if (items.length === 0) {
      setPhase('result');
      setQuizItems([]);
      return;
    }
    setQuizItems(items);
    setAnswers(new Array(items.length).fill(null));
    setCurrentIndex(0);
    setSelectedOption(null);
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
        setPhase('result');
      }
    }, 600);
  };

  const handleResultClose = () => {
    navigation.goBack();
  };

  const goToLearnPrev = () => {
    if (currentIndex <= 0) return;
    stopRepeating();
    setRevealed(false);
    setCurrentIndex(currentIndex - 1);
  };

  const goToLearnNext = () => {
    if (currentIndex >= todaySentences.length - 1) return;
    stopRepeating();
    setRevealed(false);
    setCurrentIndex(currentIndex + 1);
  };

  const handlePlayListen = () => {
    const s = todaySentences[currentIndex];
    if (!s) return;
    startRepeating(s.text, s.meaning_ko);
  };

  if (phase === 'loading') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>퀴즈 준비 중...</Text>
        </View>
      </View>
    );
  }

  if (phase === 'result') {
    const correctCount =
      quizItems.length > 0
        ? answers.filter((a, i) => a === quizItems[i].correctIndex).length
        : 0;
    const totalCount = quizItems.length;
    const pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const isEmpty = mode === 'today' ? todaySentences.length === 0 : quizItems.length === 0;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.resultContent}>
          {isEmpty ? (
            <>
              <Text style={styles.resultEmoji}>📚</Text>
              <Text style={styles.resultTitle}>
                {mode === 'today' ? '오늘의 문장이 없어요' : '아직 배운 문장이 없어요'}
              </Text>
              <Text style={styles.resultDesc}>
                {mode === 'today'
                  ? 'Night Input에서 오늘의 문장을 확인해 보세요.'
                  : '알람 해제할 때 문장을 읽고 나면 누적 퀴즈에 나와요.'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.resultEmoji}>🎉</Text>
              <Text style={styles.resultTitle}>퀴즈 완료!</Text>
              <Text style={styles.resultDesc}>
                {correctCount}/{totalCount} 맞음 ({pct}%)
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

  // ── 오늘 문장 다시보기: 영어/한글 중 하나 가리고 학습 ──
  if (phase === 'learn' && mode === 'today') {
    const current = todaySentences[currentIndex];
    if (!current) return null;

    const progress = (currentIndex + 1) / todaySentences.length;
    const showEnFirst = hideMode === 'ko';
    const visibleText = showEnFirst ? current.text : current.meaning_ko;
    const hiddenText = showEnFirst ? current.meaning_ko : current.text;
    const visibleLabel = showEnFirst ? '영어' : '한글';
    const hiddenLabel = showEnFirst ? '한글 뜻' : '영어 문장';

    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.quizHeader}>
          <TouchableOpacity onPress={() => { stopRepeating(); navigation.goBack(); }} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.questionCount}>
            {currentIndex + 1} / {todaySentences.length}
          </Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.quizLabel}>{title}</Text>
        </View>

        <View style={styles.learnContent}>
          <View style={styles.hideModeRow}>
            <TouchableOpacity
              style={[styles.hideModeBtn, hideMode === 'en' && styles.hideModeBtnActive]}
              onPress={() => { setHideMode('en'); setRevealed(false); }}
            >
              <Text style={[styles.hideModeBtnText, hideMode === 'en' && styles.hideModeBtnTextActive]}>
                한글 보기 (영어 가리기)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.hideModeBtn, hideMode === 'ko' && styles.hideModeBtnActive]}
              onPress={() => { setHideMode('ko'); setRevealed(false); }}
            >
              <Text style={[styles.hideModeBtnText, hideMode === 'ko' && styles.hideModeBtnTextActive]}>
                영어 보기 (한글 가리기)
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.learnCard}>
            <Text style={styles.learnVisibleLabel}>{visibleLabel}</Text>
            <Text style={styles.learnVisibleText}>{visibleText}</Text>
          </View>

          <TouchableOpacity
            style={styles.learnHiddenArea}
            onPress={() => setRevealed(true)}
            activeOpacity={0.9}
          >
            {revealed ? (
              <>
                <Text style={styles.learnHiddenLabel}>{hiddenLabel}</Text>
                <Text style={styles.learnHiddenText}>{hiddenText}</Text>
              </>
            ) : (
              <Text style={styles.learnTapHint}>탭하여 {hiddenLabel} 보기</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.listenBtn} onPress={handlePlayListen}>
            <Text style={styles.listenBtnIcon}>🔊</Text>
            <Text style={styles.listenBtnText}>들어보기 (영어 → 한글 반복)</Text>
          </TouchableOpacity>

          <View style={styles.learnNavRow}>
            <TouchableOpacity
              style={[styles.learnNavBtn, currentIndex === 0 && styles.learnNavBtnDisabled]}
              onPress={goToLearnPrev}
              disabled={currentIndex === 0}
            >
              <Text style={styles.learnNavBtnText}>이전</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.learnNavBtn, currentIndex >= todaySentences.length - 1 && styles.learnNavBtnDisabled]}
              onPress={goToLearnNext}
              disabled={currentIndex >= todaySentences.length - 1}
            >
              <Text style={styles.learnNavBtnText}>다음</Text>
            </TouchableOpacity>
          </View>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.questionCount}>
          {currentIndex + 1} / {quizItems.length}
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.quizLabel}>{title}</Text>
      </View>

      <Animated.View style={[styles.quizContent, { opacity: fadeAnim }]}>
        <View style={styles.questionCard}>
          {currentItem.type === 'en_to_ko' && (
            <>
              <Text style={styles.sentenceText}>{currentItem.sentence.text}</Text>
              <Text style={styles.questionText}>이 문장의 뜻은?</Text>
            </>
          )}
          {currentItem.type === 'ko_to_en' && (
            <>
              <Text style={styles.sentenceText}>{currentItem.sentence.meaning_ko}</Text>
              <Text style={styles.questionText}>이 뜻을 영어로 하면?</Text>
            </>
          )}
          {currentItem.type === 'fill_blank' && currentItem.blankedText && (
            <>
              <Text style={styles.sentenceText}>{currentItem.blankedText}</Text>
              <Text style={styles.questionText}>빈칸에 들어갈 알맞은 것은?</Text>
            </>
          )}
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
            const isLongOption = currentItem.type === 'ko_to_en' && option.length > 40;
            return (
              <TouchableOpacity
                key={i}
                style={optionStyle}
                onPress={() => handleOptionSelect(i)}
                disabled={selectedOption !== null}
                activeOpacity={0.7}
              >
                <Text style={styles.optionNumber}>{String.fromCharCode(65 + i)}</Text>
                <Text
                  style={[
                    textStyle,
                    isLongOption && styles.optionTextSmall,
                  ]}
                  numberOfLines={isLongOption ? 3 : 1}
                >
                  {option}
                </Text>
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
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 0,
    padding: 8,
    zIndex: 1,
  },
  backBtnText: {
    fontSize: 24,
    color: colors.primary,
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
  learnContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  hideModeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  hideModeBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.card,
  },
  hideModeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  hideModeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  hideModeBtnTextActive: {
    color: colors.primary,
  },
  learnCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: 24,
    marginBottom: 16,
    ...shadows.card,
  },
  learnVisibleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  learnVisibleText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 32,
    textAlign: 'center',
  },
  learnHiddenArea: {
    backgroundColor: colors.cardAlt,
    borderRadius: borderRadius.xl,
    padding: 24,
    marginBottom: 20,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  learnHiddenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  learnHiddenText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 28,
    textAlign: 'center',
  },
  learnTapHint: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: borderRadius.xl,
    marginBottom: 24,
    ...shadows.fab,
  },
  listenBtnIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  listenBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  learnNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  learnNavBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.card,
  },
  learnNavBtnDisabled: {
    opacity: 0.5,
  },
  learnNavBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
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
  optionTextSmall: {
    fontSize: 14,
    lineHeight: 20,
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
