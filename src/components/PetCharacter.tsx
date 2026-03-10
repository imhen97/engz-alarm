import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import type { PetState, PetGrowthStage, PetMood } from '../types';
import { getDecorationItem } from '../data/petShop';
import { colors, borderRadius } from '../theme';

const STAGE_EMOJI: Record<PetGrowthStage, string> = {
  puppy: '🐕',
  teen: '🐶',
  adult: '🦮',
  hero: '🌟',
};

const MOOD_LABEL: Record<PetMood, string> = {
  happy: '기분 좋아요!',
  normal: '편안해요',
  hungry: '배고파요...',
  sleepy: '졸려요...',
};

/** 마지막 밥 시간(ISO) → 기분 */
export function getMoodFromLastFed(lastFedIso: string | undefined): PetMood {
  if (!lastFedIso) return 'hungry';
  const fed = new Date(lastFedIso).getTime();
  const now = Date.now();
  const hours = (now - fed) / (1000 * 60 * 60);
  if (hours < 6) return 'happy';
  if (hours < 18) return 'normal';
  if (hours < 30) return 'hungry';
  return 'sleepy';
}

/** 사용자 레벨(1~8) → 성장 단계 */
export function getGrowthStageFromLevel(level: number): PetGrowthStage {
  if (level <= 2) return 'puppy';
  if (level <= 4) return 'teen';
  if (level <= 6) return 'adult';
  return 'hero';
}

function hungerFromMood(mood: PetMood): number {
  switch (mood) {
    case 'happy': return 85;
    case 'normal': return 55;
    case 'hungry': return 20;
    case 'sleepy': return 40;
  }
}

interface PetCharacterProps {
  pet?: PetState;
  userLevel?: number;
  mood?: PetMood;
  equippedIds?: string[];
  size?: 'small' | 'medium' | 'large';
  showMoodLabel?: boolean;
}

function buildPetFromProps(
  userLevel: number,
  mood: PetMood,
  equippedIds: string[]
): PetState {
  const hat = equippedIds.map((id) => getDecorationItem(id)).find((d) => d?.slot === 'hat');
  const scarf = equippedIds.map((id) => getDecorationItem(id)).find((d) => d?.slot === 'scarf');
  const bg = equippedIds.map((id) => getDecorationItem(id)).find((d) => d?.slot === 'background');
  return {
    growth_stage: getGrowthStageFromLevel(userLevel),
    hunger: hungerFromMood(mood),
    mood,
    last_fed_at: '',
    equipped_hat_id: hat?.id ?? null,
    equipped_scarf_id: scarf?.id ?? null,
    equipped_background_id: bg?.id ?? null,
  };
}

export default function PetCharacter(props: PetCharacterProps) {
  const pet: PetState = props.pet ?? buildPetFromProps(
    props.userLevel ?? 1,
    props.mood ?? 'normal',
    props.equippedIds ?? []
  );
  const size = props.size ?? 'large';
  const showMoodLabel = props.showMoodLabel ?? true;
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [bounce]);

  const translateY = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const emojiSize = size === 'small' ? 48 : size === 'medium' ? 72 : 120;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.characterContainer, size === 'large' && styles.characterContainerLarge]}>
        {pet.equipped_background_id && (
          <View style={styles.bgBadge}>
            <Text style={styles.bgEmoji}>🖼️</Text>
          </View>
        )}
        <Animated.View
          style={[
            styles.emojiWrap,
            { transform: [{ translateY }] },
          ]}
        >
          <Text style={[styles.emoji, { fontSize: emojiSize }]}>
            {STAGE_EMOJI[pet.growth_stage]}
          </Text>
          {pet.equipped_hat_id && (
            <View style={styles.hatOverlay}>
              <Text style={styles.hatEmoji}>🧢</Text>
            </View>
          )}
        </Animated.View>
        {pet.equipped_scarf_id && (
          <View style={styles.scarfOverlay}>
            <Text style={styles.scarfEmoji}>🧣</Text>
          </View>
        )}
      </View>
      {showMoodLabel && (
        <>
          <Text style={styles.moodLabel}>{MOOD_LABEL[pet.mood]}</Text>
          <View style={styles.hungerBarBg}>
            <View style={[styles.hungerBarFill, { width: `${pet.hunger}%` }]} />
          </View>
          <Text style={styles.hungerCaption}>포만감 {pet.hunger}%</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  characterContainerLarge: {
    minHeight: 140,
  },
  emojiWrap: {
    position: 'relative',
  },
  emoji: {
    textAlign: 'center',
  },
  hatOverlay: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -16,
  },
  hatEmoji: {
    fontSize: 28,
  },
  scarfOverlay: {
    marginTop: -12,
  },
  scarfEmoji: {
    fontSize: 24,
  },
  bgBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  bgEmoji: {
    fontSize: 20,
  },
  moodLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  hungerBarBg: {
    height: 8,
    width: 160,
    backgroundColor: colors.divider,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  hungerBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  hungerCaption: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});
