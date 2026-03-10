import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import PetCharacter, {
  getGrowthStageFromLevel,
  getMoodFromLastFed,
} from '../components/PetCharacter';
import { getLevelFromXP } from '../data/badges';
import { colors, shadows, borderRadius } from '../theme';
import type { PetGrowthStage } from '../types';

const STAGE_LABEL: Record<PetGrowthStage, string> = {
  puppy: '아기 강아지',
  teen: '캥거루 강아지',
  adult: '어른 강아지',
  hero: '슈퍼 강아지',
};

const FEED_COST = 10;

export default function PetScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { settings, loadSettings, addCoins, feedPet } = useAppStore();

  const userLevel = getLevelFromXP(settings.user_xp);
  const stage = getGrowthStageFromLevel(userLevel);
  const mood = getMoodFromLastFed(settings.pet_last_fed);
  const coins = settings.user_coins ?? 0;
  const canFeed = coins >= FEED_COST;

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const handleFeed = async () => {
    if (!canFeed) return;
    await addCoins(-FEED_COST);
    await feedPet();
    await loadSettings();
  };

  const handleShop = () => {
    (navigation as any).navigate('Shop');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <View style={styles.coinBadge}>
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinText}>{coins}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>우리 강아지</Text>
        <PetCharacter
          userLevel={userLevel}
          mood={mood}
          equippedIds={settings.pet_accessories ?? []}
          size="large"
          showMoodLabel
        />
        <Text style={styles.stageLabel}>{STAGE_LABEL[stage]}</Text>
        <Text style={styles.hint}>레벨이 올라가면 강아지도 함께 자라요!</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnFeed, !canFeed && styles.btnDisabled]}
            onPress={handleFeed}
            disabled={!canFeed}
            activeOpacity={0.8}
          >
            <Text style={styles.btnEmoji}>🦴</Text>
            <Text style={styles.btnLabel}>밥 주기</Text>
            <Text style={styles.btnSub}>{FEED_COST} 코인</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnShop]}
            onPress={handleShop}
            activeOpacity={0.8}
          >
            <Text style={styles.btnEmoji}>👕</Text>
            <Text style={styles.btnLabel}>꾸미기</Text>
            <Text style={styles.btnSub}>먹이·악세서리</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    ...shadows.card,
  },
  coinEmoji: {
    fontSize: 18,
    marginRight: 4,
  },
  coinText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  stageLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 8,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    width: '100%',
    maxWidth: 320,
  },
  btn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnFeed: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primaryLight,
  },
  btnShop: {},
  btnDisabled: {
    opacity: 0.6,
  },
  btnEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  btnLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  btnSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
