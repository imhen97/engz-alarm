import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { Sentence } from '../types';
import { speak, stopSpeaking } from '../services/ttsService';
import { getOrCreateDailySentences } from '../services/dailySentencesService';
import { getVocabularyForSentence } from '../data/vocabulary';
import { getOrCreateTomorrowVocabSet, markTomorrowVocabStudied, getVocabSetState } from '../services/dailyVocabService';
import { colors, borderRadius, shadows } from '../theme';

const CARD_MARGIN = 6;
const CONTAINER_PADDING = 20;

export default function NightInputScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const navigation = useNavigation();
  const { settings } = useAppStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [vocabLoading, setVocabLoading] = useState(true);
  const [tomorrowVocab, setTomorrowVocab] = useState<{ targetDate: string; words: { word: string; meaning_ko: string }[] } | null>(null);
  const [vocabStudied, setVocabStudied] = useState(false);

  const cardWidth = screenWidth - CONTAINER_PADDING * 2 - CARD_MARGIN * 2;
  const cardTotalWidth = cardWidth + CARD_MARGIN * 2;

  useEffect(() => {
    loadSentences();
    loadTomorrowVocab();
    return () => {
      stopSpeaking();
    };
  }, []);

  const loadSentences = async () => {
    setLoading(true);
    const list = await getOrCreateDailySentences(settings);
    setSentences(list);
    setLoading(false);
  };

  const loadTomorrowVocab = async () => {
    setVocabLoading(true);
    const set = await getOrCreateTomorrowVocabSet(10);
    setTomorrowVocab(set);
    const state = await getVocabSetState();
    setVocabStudied(!!(state?.targetDate === set.targetDate && state?.studiedAt && state.studiedAt.trim().length > 0));
    setVocabLoading(false);
  };

  const handleMarkVocabStudied = async () => {
    await markTomorrowVocabStudied();
    setVocabStudied(true);
  };

  const handlePlay = (index: number) => {
    const s = sentences[index];
    if (!s) return;
    if (playingIndex === index) {
      stopSpeaking();
      setPlayingIndex(null);
      return;
    }
    stopSpeaking();
    setPlayingIndex(index);
    speak(s.text, () => {
      setPlayingIndex(null);
    });
  };

  const handleClose = () => {
    stopSpeaking();
    navigation.goBack();
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / cardTotalWidth);
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      scrollViewRef.current?.scrollTo({
        x: newIndex * cardTotalWidth,
        animated: true,
      });
    }
  };

  const goToNext = () => {
    if (currentIndex < sentences.length - 1) {
      const newIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: newIndex * cardTotalWidth,
        animated: true,
      });
    }
  };

  return (
    <View style={styles.gradient}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Night Input</Text>

        <View style={styles.moonArea}>
          <Text style={styles.moonEmoji}>🌙</Text>
          <View style={styles.starsRow}>
            <Text style={styles.star}>✦</Text>
            <Text style={[styles.star, styles.starSmall]}>✦</Text>
            <Text style={styles.star}>✦</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : sentences.length === 0 ? (
          <Text style={styles.emptyText}>오늘 배울 문장이 없어요.</Text>
        ) : (
          <View style={styles.cardSection}>
            <ScrollView
              ref={scrollViewRef}
              style={[styles.scroll, { width: cardTotalWidth }]}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {sentences.map((sentence, index) => (
                <View key={sentence.id} style={[styles.sentenceCard, { width: cardWidth }]}>
                  <Text style={styles.sentenceLabel}>
                    문장 {index + 1} / {sentences.length}
                  </Text>
                  <View style={styles.sentenceTextWrap}>
                    <Text style={styles.sentenceText}>{sentence.text}</Text>
                  </View>
                  <View style={styles.meaningTextWrap}>
                    <Text style={styles.meaningText}>{sentence.meaning_ko}</Text>
                  </View>

                  {getVocabularyForSentence(sentence.text).length > 0 && (
                    <View style={styles.vocabBlock}>
                      <Text style={styles.vocabTitle}>어려운 단어</Text>
                      {getVocabularyForSentence(sentence.text).map((item) => (
                        <View key={item.word} style={styles.vocabRow}>
                          <Text style={styles.vocabWord}>{item.word}</Text>
                          <Text style={styles.vocabMeaning}>{item.meaning_ko}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => handlePlay(index)}
                    style={styles.playBtn}
                  >
                    <Text style={styles.playBtnIcon}>
                      {playingIndex === index ? '⏸' : '▶️'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            {sentences.length > 1 && (
              <>
                <TouchableOpacity
                  style={[
                    styles.navArrowOverlay,
                    styles.navArrowLeft,
                    currentIndex === 0 && styles.navArrowDisabled,
                  ]}
                  onPress={goToPrevious}
                  disabled={currentIndex === 0}
                  activeOpacity={0.7}
                >
                  <Text style={styles.navArrowIcon}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.navArrowOverlay,
                    styles.navArrowRight,
                    currentIndex >= sentences.length - 1 && styles.navArrowDisabled,
                  ]}
                  onPress={goToNext}
                  disabled={currentIndex >= sentences.length - 1}
                  activeOpacity={0.7}
                >
                  <Text style={styles.navArrowIcon}>›</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.goodNightText} numberOfLines={1}>
            Good night 😴
          </Text>
          <Text style={styles.tipText}>
            {sentences.length > 0
              ? `오늘 알람에서 이 ${sentences.length}문장으로 해제하게 됩니다.\n미리 들어보세요!`
              : '설정에서 하루 문장 수를 확인해 주세요.'}
          </Text>
        </View>

        {/* Tomorrow Vocab Study */}
        <View style={styles.vocabStudyCard}>
          <Text style={styles.vocabStudyTitle}>내일 아침 알람 단어 10개</Text>
          {vocabLoading ? (
            <Text style={styles.vocabStudySub}>단어 준비 중...</Text>
          ) : tomorrowVocab ? (
            <>
              <Text style={styles.vocabStudySub}>
                {tomorrowVocab.targetDate} 아침에 단어 퀴즈(80% 이상)를 풀어야 알람이 꺼져요.
              </Text>
              <View style={styles.vocabGrid}>
                {tomorrowVocab.words.map((w) => (
                  <View key={w.word} style={styles.vocabChip}>
                    <Text style={styles.vocabChipWord}>{w.word}</Text>
                    <Text style={styles.vocabChipMeaning} numberOfLines={2}>
                      {w.meaning_ko}
                    </Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.vocabStudyBtn, vocabStudied && styles.vocabStudyBtnDone]}
                onPress={handleMarkVocabStudied}
                disabled={vocabStudied}
              >
                <Text style={styles.vocabStudyBtnText}>
                  {vocabStudied ? '학습 완료 ✓' : '10단어 학습 완료 체크'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.vocabStudySub}>단어를 불러오지 못했어요.</Text>
          )}
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleClose}>
          <Text style={styles.confirmBtnText}>잘자요 🌟</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: colors.nightBg1,
  },
  container: {
    flex: 1,
    paddingHorizontal: CONTAINER_PADDING,
    paddingTop: 56,
    paddingBottom: 24,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  closeBtnText: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.5)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.nightText,
    textAlign: 'center',
    marginBottom: 32,
  },
  moonArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  moonEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  star: {
    fontSize: 16,
    color: 'rgba(255, 255, 200, 0.6)',
  },
  starSmall: {
    fontSize: 10,
    marginTop: 6,
  },
  cardSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 340,
    marginBottom: 24,
    position: 'relative',
  },
  scroll: {
    height: 320,
  },
  scrollContent: {
    alignItems: 'center',
  },
  navArrowOverlay: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  navArrowLeft: {
    left: 4,
  },
  navArrowRight: {
    right: 4,
  },
  navArrowDisabled: {
    opacity: 0.25,
  },
  navArrowIcon: {
    fontSize: 22,
    color: colors.white,
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(200, 200, 255, 0.7)',
    textAlign: 'center',
  },
  sentenceLabel: {
    fontSize: 12,
    color: 'rgba(200, 200, 255, 0.5)',
    marginBottom: 8,
  },
  sentenceCard: {
    backgroundColor: colors.nightCard,
    borderRadius: borderRadius.xl,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: CARD_MARGIN,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sentenceTextWrap: {
    width: '100%',
    marginBottom: 10,
  },
  sentenceText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    lineHeight: 32,
  },
  meaningTextWrap: {
    width: '100%',
    marginBottom: 16,
  },
  meaningText: {
    fontSize: 15,
    color: 'rgba(200, 200, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  vocabBlock: {
    width: '100%',
    marginTop: 4,
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  vocabTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(200, 200, 255, 0.6)',
    marginBottom: 10,
  },
  vocabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  vocabWord: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    minWidth: 90,
  },
  vocabMeaning: {
    fontSize: 14,
    color: 'rgba(220, 220, 255, 0.85)',
    flex: 1,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
  playBtnIcon: {
    fontSize: 24,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    minHeight: 80,
  },
  goodNightText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  tipText: {
    fontSize: 13,
    color: 'rgba(200, 200, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.full,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  confirmBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },

  // Tomorrow Vocab Study
  vocabStudyCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
    marginBottom: 14,
  },
  vocabStudyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 6,
  },
  vocabStudySub: {
    fontSize: 12,
    color: 'rgba(200, 200, 255, 0.65)',
    lineHeight: 18,
    marginBottom: 12,
  },
  vocabGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  vocabChip: {
    width: '48%',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: borderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  vocabChipWord: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 2,
  },
  vocabChipMeaning: {
    fontSize: 12,
    color: 'rgba(220, 220, 255, 0.85)',
    lineHeight: 16,
  },
  vocabStudyBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: 12,
    alignItems: 'center',
    ...shadows.card,
  },
  vocabStudyBtnDone: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  vocabStudyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
});
