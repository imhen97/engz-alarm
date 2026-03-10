import type { FoodItem, DecorationItem, ShopItem } from '../types';

export const FOOD_ITEMS: FoodItem[] = [
  { id: 'food_bone', type: 'food', name_ko: '뼈다귀', emoji: '🦴', coin_cost: 15, hunger_restore: 25 },
  { id: 'food_treat', type: 'food', name_ko: '간식', emoji: '🍖', coin_cost: 35, hunger_restore: 50 },
  { id: 'food_meal', type: 'food', name_ko: '맛있는 밥', emoji: '🍲', coin_cost: 60, hunger_restore: 85 },
  { id: 'food_premium', type: 'food', name_ko: '프리미엄 디너', emoji: '🥩', coin_cost: 120, hunger_restore: 100 },
];

export const DECORATION_ITEMS: DecorationItem[] = [
  { id: 'hat_cap', type: 'decoration', slot: 'hat', name_ko: '모자', emoji: '🧢', coin_cost: 40 },
  { id: 'hat_crown', type: 'decoration', slot: 'hat', name_ko: '왕관', emoji: '👑', coin_cost: 100 },
  { id: 'hat_beret', type: 'decoration', slot: 'hat', name_ko: '베레모', emoji: '🎩', coin_cost: 55 },
  { id: 'hat_flower', type: 'decoration', slot: 'hat', name_ko: '꽃 리본', emoji: '🌸', coin_cost: 45 },
  { id: 'scarf_red', type: 'decoration', slot: 'scarf', name_ko: '빨간 스카프', emoji: '🧣', coin_cost: 50 },
  { id: 'scarf_blue', type: 'decoration', slot: 'scarf', name_ko: '파란 스카프', emoji: '💙', coin_cost: 50 },
  { id: 'scarf_bow', type: 'decoration', slot: 'scarf', name_ko: '나비넥타이', emoji: '🎀', coin_cost: 60 },
  { id: 'bg_garden', type: 'decoration', slot: 'background', name_ko: '정원', emoji: '🌳', coin_cost: 80 },
  { id: 'bg_stars', type: 'decoration', slot: 'background', name_ko: '별하늘', emoji: '🌌', coin_cost: 120 },
];

export const ALL_SHOP_ITEMS: ShopItem[] = [...FOOD_ITEMS, ...DECORATION_ITEMS];

export function getFoodItem(id: string): FoodItem | undefined {
  return FOOD_ITEMS.find((f) => f.id === id);
}

export function getDecorationItem(id: string): DecorationItem | undefined {
  return DECORATION_ITEMS.find((d) => d.id === id);
}
