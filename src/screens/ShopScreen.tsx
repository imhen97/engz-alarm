import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { FOOD_ITEMS, DECORATION_ITEMS, getDecorationItem } from '../data/petShop';
import type { DecorationItem } from '../types';
import { colors, shadows, borderRadius } from '../theme';

export default function ShopScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    settings,
    loadSettings,
    addCoins,
    feedPet,
    setPetAccessories,
    setOwnedDecorations,
  } = useAppStore();

  const coins = settings.user_coins ?? 0;
  const equipped = settings.pet_accessories ?? [];
  const owned = settings.owned_decorations ?? [];

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const handleBuyFood = async (cost: number) => {
    if (coins < cost) {
      Alert.alert('코인 부족', '알람을 해제하면 코인을 받을 수 있어요!');
      return;
    }
    await addCoins(-cost);
    await feedPet();
    await loadSettings();
    Alert.alert('맛있게 먹었어요! 🐶', '강아지가 행복해해요!');
  };

  const handleBuyDecoration = async (item: DecorationItem) => {
    if (coins < item.coin_cost) {
      Alert.alert('코인 부족', '알람을 해제하면 코인을 받을 수 있어요!');
      return;
    }
    if (owned.includes(item.id)) {
      // 이미 보유 → 장착 토글
      const next = [...equipped];
      const idx = next.indexOf(item.id);
      if (idx >= 0) {
        next.splice(idx, 1);
      } else {
        const sameSlot = next.find((id) => getDecorationItem(id)?.slot === item.slot);
        if (sameSlot) next.splice(next.indexOf(sameSlot), 1);
        next.push(item.id);
      }
      await setPetAccessories(next);
      await loadSettings();
      return;
    }
    await addCoins(-item.coin_cost);
    await setOwnedDecorations([...owned, item.id]);
    await setPetAccessories([...equipped.filter((id) => getDecorationItem(id)?.slot !== item.slot), item.id]);
    await loadSettings();
    Alert.alert('구매 완료!', `${item.name_ko}(을)를 장착했어요.`);
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
        <Text style={styles.sectionTitle}>🦴 먹이</Text>
        <Text style={styles.sectionHint}>먹이를 사면 강아지에게 바로 먹여줘요!</Text>
        <View style={styles.grid}>
          {FOOD_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => handleBuyFood(item.coin_cost)}
              disabled={coins < item.coin_cost}
              activeOpacity={0.8}
            >
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <Text style={styles.cardName}>{item.name_ko}</Text>
              <Text style={styles.cardCost}>🪙 {item.coin_cost}</Text>
              <Text style={styles.cardSub}>포만감 +{item.hunger_restore}%</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>👕 꾸미기</Text>
        <Text style={styles.sectionHint}>장식을 사면 강아지에게 바로 장착돼요.</Text>
        <View style={styles.grid}>
          {DECORATION_ITEMS.map((item) => {
            const isOwned = owned.includes(item.id);
            const isEquipped = equipped.includes(item.id);
            const canBuy = coins >= item.coin_cost || isOwned;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, isEquipped && styles.cardEquipped]}
                onPress={() => handleBuyDecoration(item)}
                disabled={!canBuy}
                activeOpacity={0.8}
              >
                <Text style={styles.cardEmoji}>{item.emoji}</Text>
                <Text style={styles.cardName}>{item.name_ko}</Text>
                {isOwned ? (
                  <Text style={styles.cardOwned}>{isEquipped ? '✓ 장착 중' : '탭하여 장착'}</Text>
                ) : (
                  <Text style={styles.cardCost}>🪙 {item.coin_cost}</Text>
                )}
              </TouchableOpacity>
            );
          })}
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
  backBtn: { paddingVertical: 8, paddingRight: 12 },
  backText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    ...shadows.card,
  },
  coinEmoji: { fontSize: 18, marginRight: 4 },
  coinText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  sectionHint: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '47%',
    minWidth: 140,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardEquipped: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardEmoji: { fontSize: 36, marginBottom: 6 },
  cardName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  cardCost: { fontSize: 13, fontWeight: '600', color: colors.primary, marginTop: 4 },
  cardSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  cardOwned: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
