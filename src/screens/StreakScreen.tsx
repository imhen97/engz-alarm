import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  getCurrentStreak,
  getMonthlyCount,
  getStreakRecords,
  getRecentSentences,
  StreakRecord,
} from '../db/streakRepo';
import {
  getXP,
  getTotalCorrect,
  getTotalAttempts,
  getUnlockedBadges,
  getWeeklyAccuracy,
} from '../db/progressRepo';
import { useAppStore } from '../store/useAppStore';
import { Badge } from '../types';
import {
  BADGES,
  getLevelLabel,
  getLevelEmoji,
  getXPForNextLevel,
  getXPForCurrentLevel,
  getLevelFromXP,
  getLevelWithSubLabel,
  MAX_LEVEL,
} from '../data/badges';
import { colors, shadows, borderRadius } from '../theme';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_LABELS_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

export default function StreakScreen() {
  const navigation = useNavigation();
  const { settings } = useAppStore();

  const [streak, setStreak] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [weekDates, setWeekDates] = useState<{ date: string; day: number; isToday: boolean }[]>([]);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [recentSentences, setRecentSentences] = useState<StreakRecord[]>([]);
  const [daysInMonth, setDaysInMonth] = useState(30);

  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [unlockedBadges, setUnlockedBadges] = useState<Badge[]>([]);
  const [weeklyAccuracy, setWeeklyAccuracy] = useState<{ date: string; accuracy: number }[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const [
      streakVal,
      monthCount,
      recent,
      xpVal,
      correctVal,
      attemptsVal,
      badges,
      accuracy,
    ] = await Promise.all([
      getCurrentStreak(),
      getMonthlyCount(year, month),
      getRecentSentences(5),
      getXP(),
      getTotalCorrect(),
      getTotalAttempts(),
      getUnlockedBadges(),
      getWeeklyAccuracy(),
    ]);

    setStreak(streakVal);
    setMonthlyCount(monthCount);
    setRecentSentences(recent);
    setDaysInMonth(new Date(year, month, 0).getDate());
    setXP(xpVal);
    setLevel(getLevelFromXP(xpVal));
    setTotalCorrect(correctVal);
    setTotalAttempts(attemptsVal);
    setUnlockedBadges(badges);
    setWeeklyAccuracy(accuracy);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const week: { date: string; day: number; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      week.push({
        date: d.toISOString().split('T')[0],
        day: d.getDate(),
        isToday: d.toDateString() === today.toDateString(),
      });
    }
    setWeekDates(week);

    if (week.length > 0) {
      const records = await getStreakRecords(week[0].date, week[6].date);
      const completed = new Set(records.filter(r => r.completed).map(r => r.date));
      setCompletedDates(completed);
    }
  };

  const currentLevelXP = getXPForCurrentLevel(level);
  const nextLevelXP = getXPForNextLevel(level);
  const xpInLevel = xp - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const xpPercent = level >= MAX_LEVEL ? 100 : Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  const monthlyGoal = daysInMonth;
  const progressPercent = Math.min(100, Math.round((monthlyCount / monthlyGoal) * 100));

  const unlockedSet = new Set(unlockedBadges.map(b => b.id));
  const maxAccuracy = Math.max(...weeklyAccuracy.map(d => d.accuracy), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← 뒤로</Text>
      </TouchableOpacity>

      <Text style={styles.title}>나의 성장</Text>

      {/* Level Card */}
      <View style={styles.levelCard}>
        <View style={styles.levelTop}>
          <Text style={styles.levelEmoji}>{getLevelEmoji(level)}</Text>
          <View style={styles.levelInfo}>
            <Text style={styles.levelTitle}>{getLevelWithSubLabel(level, settings.sub_level ?? 1)}</Text>
            <Text style={styles.levelStats}>
              총 {totalCorrect}문장 성공 / {totalAttempts}회 시도
            </Text>
          </View>
        </View>
        <View style={styles.xpBarContainer}>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${xpPercent}%` }]} />
          </View>
          <Text style={styles.xpText}>
            {level >= MAX_LEVEL ? 'MAX LEVEL' : `${xpInLevel} / ${xpNeeded} XP`}
          </Text>
        </View>
      </View>

      {/* Weekly Accuracy Chart */}
      <Text style={styles.sectionTitle}>주간 정확도</Text>
      <View style={styles.chartCard}>
        {weeklyAccuracy.length === 0 ? (
          <Text style={styles.chartEmpty}>아직 데이터가 없어요</Text>
        ) : (
          <View style={styles.chartContainer}>
            {weeklyAccuracy.map((day, i) => {
              const barHeight = day.accuracy > 0 ? Math.max(8, (day.accuracy / 100) * 120) : 4;
              const dayOfWeek = new Date(day.date).getDay();
              return (
                <View key={i} style={styles.chartBar}>
                  <Text style={styles.chartValue}>
                    {day.accuracy > 0 ? `${Math.round(day.accuracy)}%` : '-'}
                  </Text>
                  <View style={styles.chartBarOuter}>
                    <View
                      style={[
                        styles.chartBarInner,
                        {
                          height: barHeight,
                          backgroundColor: day.accuracy >= 80
                            ? colors.success
                            : day.accuracy >= 50
                            ? colors.warning
                            : day.accuracy > 0
                            ? colors.error
                            : colors.divider,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>{DAY_LABELS_SHORT[dayOfWeek]}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Badge Collection */}
      <Text style={styles.sectionTitle}>배지 컬렉션</Text>
      <View style={styles.badgeGrid}>
        {BADGES.map((badge) => {
          const isUnlocked = unlockedSet.has(badge.id);
          const unlockDate = unlockedBadges.find(b => b.id === badge.id)?.unlocked_at;
          return (
            <View
              key={badge.id}
              style={[styles.badgeCard, !isUnlocked && styles.badgeCardLocked]}
            >
              <Text style={[styles.badgeEmoji, !isUnlocked && styles.badgeEmojiLocked]}>
                {badge.emoji}
              </Text>
              <Text style={[styles.badgeName, !isUnlocked && styles.badgeNameLocked]}>
                {badge.name}
              </Text>
              <Text style={styles.badgeDesc}>
                {isUnlocked ? badge.description : '???'}
              </Text>
              {isUnlocked && unlockDate && (
                <Text style={styles.badgeDate}>
                  {unlockDate.split('T')[0]}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Streak + Week Calendar */}
      <Text style={styles.sectionTitle}>출석 기록</Text>
      <View style={styles.calendarCard}>
        <View style={styles.weekHeader}>
          {WEEKDAY_LABELS.map((label, i) => (
            <Text key={i} style={styles.weekLabel}>{label}</Text>
          ))}
        </View>
        <View style={styles.weekRow}>
          {weekDates.map((item, i) => {
            const isCompleted = completedDates.has(item.date);
            return (
              <View
                key={i}
                style={[
                  styles.dayCircle,
                  isCompleted && styles.dayCircleCompleted,
                  item.isToday && !isCompleted && styles.dayCircleToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    isCompleted && styles.dayNumCompleted,
                    item.isToday && !isCompleted && styles.dayNumToday,
                  ]}
                >
                  {item.day}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Streak Counter */}
      <View style={styles.streakCard}>
        <Text style={styles.fireEmoji}>🔥</Text>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>일 연속 학습</Text>
      </View>

      {/* Monthly Goal */}
      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>월간 목표</Text>
          <Text style={styles.goalPercent}>{progressPercent}% 달성</Text>
        </View>
        <View style={styles.monthProgressBg}>
          <View style={[styles.monthProgressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.goalSubtext}>
          이번 달 {monthlyCount}/{monthlyGoal}일 완료
        </Text>
      </View>

      {/* Recent Sentences */}
      <Text style={styles.sectionTitle}>최근 학습 문장</Text>
      {recentSentences.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>아직 학습 기록이 없어요</Text>
          <Text style={styles.emptySubtext}>알람을 해제하면 기록이 남아요!</Text>
        </View>
      ) : (
        recentSentences.map((record, i) => (
          <View key={i} style={styles.sentenceRow}>
            <Text style={styles.sentenceCheck}>✅</Text>
            <View style={styles.sentenceContent}>
              <Text style={styles.sentenceText} numberOfLines={1}>
                {record.sentence_text}
              </Text>
              <Text style={styles.sentenceDate}>{record.date}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  backBtn: {
    marginBottom: 8,
  },
  backBtnText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 24,
  },

  // Level Card
  levelCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 8,
    ...shadows.card,
  },
  levelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelEmoji: {
    fontSize: 44,
    marginRight: 16,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  levelStats: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  xpBarContainer: {
    gap: 6,
  },
  xpBarBg: {
    height: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: 5,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'right',
  },

  // Weekly Accuracy Chart
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: 20,
    ...shadows.card,
  },
  chartEmpty: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartValue: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  chartBarOuter: {
    width: 24,
    height: 120,
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
  },
  chartBarInner: {
    width: '100%',
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 6,
  },

  // Badge Collection
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeCard: {
    width: '30%' as any,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 12,
    alignItems: 'center',
    ...shadows.card,
  },
  badgeCardLocked: {
    opacity: 0.4,
  },
  badgeEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  badgeEmojiLocked: {
    opacity: 0.3,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeNameLocked: {
    color: colors.textMuted,
  },
  badgeDesc: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 13,
  },
  badgeDate: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Calendar
  calendarCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 16,
    ...shadows.card,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 36,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.divider,
  },
  dayCircleCompleted: {
    backgroundColor: colors.primary,
  },
  dayCircleToday: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayNumCompleted: {
    color: colors.white,
  },
  dayNumToday: {
    color: colors.primary,
  },

  // Streak
  streakCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    ...shadows.card,
  },
  fireEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
  },
  streakLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Goal
  goalCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 8,
    ...shadows.card,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  goalPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  monthProgressBg: {
    height: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  monthProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  goalSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Recent sentences
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    ...shadows.card,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sentenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 8,
    gap: 12,
    ...shadows.card,
  },
  sentenceCheck: {
    fontSize: 18,
  },
  sentenceContent: {
    flex: 1,
  },
  sentenceText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sentenceDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
