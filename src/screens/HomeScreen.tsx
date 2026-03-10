import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import { Alarm } from '../types';
import AlarmCard from '../components/AlarmCard';
import { rescheduleAllAlarms } from '../services/alarmScheduler';
import { RootStackParamList } from '../navigation/types';
import { colors, shadows, borderRadius } from '../theme';
import {
  getLevelLabel,
  getLevelEmoji,
  getLevelFromXP,
  getXPForNextLevel,
  getXPForCurrentLevel,
  getLevelWithSubLabel,
  MAX_LEVEL,
} from '../data/badges';
import { getLearningGauge } from '../db/progressRepo';
import PetCharacter, { getMoodFromLastFed } from '../components/PetCharacter';

type HomeNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const BOTTOM_BAR_HEIGHT = 56;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const insets = useSafeAreaInsets();
  const { alarms, loadAlarms, toggleAlarm, settings } = useAppStore();

  const userXP = settings.user_xp;
  const userLevel = getLevelFromXP(userXP);
  const subLevel = settings.sub_level ?? 1;
  const currentLevelXP = getXPForCurrentLevel(userLevel);
  const nextLevelXP = getXPForNextLevel(userLevel);
  const xpInLevel = userXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const xpPercent = userLevel >= MAX_LEVEL ? 100 : Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  const [learningGauge, setLearningGauge] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadAlarms();
      getLearningGauge().then(setLearningGauge);
    }, [])
  );

  const handlePress = (alarm: Alarm) => {
    navigation.navigate('AlarmEdit', { alarmId: alarm.id });
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await toggleAlarm(id, isActive);
    const updatedAlarms = useAppStore.getState().alarms;
    await rescheduleAllAlarms(updatedAlarms);
  };

  const handleAdd = () => {
    navigation.navigate('AlarmEdit', {});
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleStreak = () => {
    navigation.navigate('Streak');
  };

  const handleNightInput = () => {
    navigation.navigate('NightInput');
  };

  const handleQuizToday = () => {
    navigation.navigate('SentenceQuiz', { mode: 'today' });
  };

  const handleQuizCumulative = () => {
    navigation.navigate('SentenceQuiz', { mode: 'cumulative' });
  };

  const handlePet = () => {
    navigation.navigate('Pet');
  };

  const petMood = getMoodFromLastFed(settings.pet_last_fed);
  const coins = settings.user_coins ?? 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.header}>
        <Text style={styles.title}>ENGZ</Text>
        <TouchableOpacity style={styles.coinBadge} onPress={handlePet} activeOpacity={0.8}>
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinText}>{coins}</Text>
        </TouchableOpacity>
      </View>

      {/* 강아지 캐릭터 (탭 → Pet) */}
      <TouchableOpacity style={styles.petArea} onPress={handlePet} activeOpacity={0.9}>
        <View style={styles.petWrap}>
          <PetCharacter
            userLevel={userLevel}
            mood={petMood}
            equippedIds={settings.pet_accessories ?? []}
            size="small"
          />
        </View>
        <Text style={styles.petHint}>탭해서 강아지에게 밥 주기·꾸미기</Text>
      </TouchableOpacity>

      {/* Level / XP Bar */}
      <TouchableOpacity
        style={styles.levelBar}
        onPress={handleStreak}
        activeOpacity={0.7}
      >
        <Text style={styles.levelBarEmoji}>{getLevelEmoji(userLevel)}</Text>
        <View style={styles.levelBarInfo}>
          <View style={styles.levelBarTop}>
            <Text style={styles.levelBarLabel}>
              {getLevelEmoji(userLevel)} {getLevelWithSubLabel(userLevel, subLevel)}
            </Text>
            <Text style={styles.levelBarXP}>
              {userLevel >= MAX_LEVEL ? 'MAX' : `${xpInLevel}/${xpNeeded} XP`}
            </Text>
          </View>
          <View style={styles.levelBarBg}>
            <View style={[styles.levelBarFill, { width: `${xpPercent}%` }]} />
          </View>
          <View style={styles.gaugeRow}>
            <Text style={styles.gaugeLabel}>새 표현</Text>
            <View style={styles.gaugeDots}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.gaugeDot,
                    i <= learningGauge && styles.gaugeDotFilled,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.gaugeCount}>{learningGauge}/5</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* 퀴즈 버튼 */}
      <View style={styles.quizRow}>
        <TouchableOpacity style={styles.quizBtn} onPress={handleQuizToday} activeOpacity={0.8}>
          <Text style={styles.quizBtnIcon}>📝</Text>
          <Text style={styles.quizBtnLabel}>오늘 문장 다시보기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quizBtn} onPress={handleQuizCumulative} activeOpacity={0.8}>
          <Text style={styles.quizBtnIcon}>📚</Text>
          <Text style={styles.quizBtnLabel}>누적 문장 퀴즈</Text>
        </TouchableOpacity>
      </View>

      {alarms.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⏰</Text>
          <Text style={styles.emptyTitle}>알람이 없어요</Text>
          <Text style={styles.emptySubtitle}>
            첫 번째 알람을 만들어서{'\n'}매일 아침 영어 연습을 시작하세요!
          </Text>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AlarmCard
              alarm={item}
              onPress={handlePress}
              onToggle={handleToggle}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: BOTTOM_BAR_HEIGHT + insets.bottom + 16 }]}
        onPress={handleAdd}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            height: BOTTOM_BAR_HEIGHT + Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleNightInput}
          style={styles.bottomBarBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.bottomBarIcon}>🌙</Text>
          <Text style={styles.bottomBarLabel}>Night</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleStreak}
          style={styles.bottomBarBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.bottomBarIcon}>🔥</Text>
          <Text style={styles.bottomBarLabel}>연속</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePet}
          style={styles.bottomBarBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.bottomBarIcon}>🐕</Text>
          <Text style={styles.bottomBarLabel}>강아지</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSettings}
          style={styles.bottomBarBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.bottomBarIcon}>⚙️</Text>
          <Text style={styles.bottomBarLabel}>설정</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    ...shadows.card,
  },
  coinEmoji: {
    fontSize: 18,
    marginRight: 4,
  },
  coinText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  petArea: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  petWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  petHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  levelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 12,
    ...shadows.card,
  },
  levelBarEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  levelBarInfo: {
    flex: 1,
  },
  levelBarTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelBarLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  levelBarXP: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  levelBarBg: {
    height: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  gaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  gaugeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  gaugeDots: {
    flexDirection: 'row',
    gap: 4,
  },
  gaugeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  gaugeDotFilled: {
    backgroundColor: colors.primary,
  },
  gaugeCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  quizRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  quizBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 12,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quizBtnIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  quizBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 120,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  bottomBarBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  bottomBarIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  bottomBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
  fabText: {
    fontSize: 32,
    color: colors.white,
    lineHeight: 34,
  },
});
