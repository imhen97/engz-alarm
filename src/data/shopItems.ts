import type { FoodItem, DecorationItem } from '../types';

/** 상점 먹이 목록 */
export const FOOD_ITEMS: FoodItem[] = [
  { id: 'food_biscuit', type: 'food', name_ko: '강아지 비스킷', emoji: '🍪', coin_cost: 5, hunger_restore: 15 },
  { id: 'food_meal', type: 'food', name_ko: '맛있는 밥', emoji: '🍖', coin_cost: 15, hunger_restore: 40 },
  { id: 'food_premium', type: 'food', name_ko: '프리미엄 간식', emoji: '🥩', coin_cost: 30, hunger_restore: 80 },
  { id: 'food_treat', type: 'food', name_ko: '즐거운 간식', emoji: '🦴', coin_cost: 10, hunger_restore: 25 },
];

/** 상점 장식 목록 */
export const DECORATION_ITEMS: DecorationItem[] = [
  { id: 'hat_cap', type: 'decoration', name_ko: '모자', emoji: '🧢', coin_cost: 20, slot: 'hat' },
  { id: 'hat_crown', type: 'decoration', name_ko: '왕관', emoji: '👑', coin_cost: 50, slot: 'hat' },
  { id: 'hat_graduation', type: 'decoration', name_ko: '졸업모', emoji: '🎓', coin_cost: 40, slot: 'hat' },
  { id: 'scarf_red', type: 'decoration', name_ko: '빨간 스카프', emoji: '🧣', coin_cost: 25, slot: 'scarf' },
  { id: 'scarf_ribbon', type: 'decoration', name_ko: '리본', emoji: '🎀', coin_cost: 15, slot: 'scarf' },
  { id: 'bg_garden', type: 'decoration', name_ko: '정원', emoji: '🌳', coin_cost: 35, slot: 'background' },
  { id: 'bg_beach', type: 'decoration', name_ko: '바다', emoji: '🏖️', coin_cost: 45, slot: 'background' },
  { id: 'bg_space', type: 'decoration', name_ko: '우주', emoji: '🌌', coin_cost: 60, slot: 'background' },
];

export const ALL_SHOP_ITEMS = [...FOOD_ITEMS, ...DECORATION_ITEMS] as const;

export function getFoodItem(id: string): FoodItem | undefined {
  return FOOD_ITEMS.find((f) => f.id === id);
}

export function getDecorationItem(id: string): DecorationItem | undefined {
  return DECORATION_ITEMS.find((d) => d.id === id);
}
