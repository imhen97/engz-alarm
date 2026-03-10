import type { PetGrowthStage, PetMood, PetState } from '../types';
import * as petRepo from '../db/petRepo';
import * as inventoryRepo from '../db/inventoryRepo';

/** 사용자 레벨(1~8) → 강아지 성장 단계 */
export function getGrowthStageFromUserLevel(level: number): PetGrowthStage {
  if (level <= 2) return 'puppy';
  if (level <= 4) return 'teen';
  if (level <= 6) return 'adult';
  return 'hero';
}

/** hunger(0~100) + 마지막 먹이 시간 → mood */
export function computeMoodFromHunger(hunger: number, lastFedAt: string): PetMood {
  if (hunger >= 80) return 'happy';
  if (hunger >= 50) return 'normal';
  if (hunger >= 20) return 'hungry';
  return 'sleepy';
}

const HUNGER_DECAY_PER_HOUR = 2; // 시간당 감소량 (대략 2일이면 80→0)

/** 마지막 먹이 시간부터 경과 시간으로 hunger 감소량 계산 */
export function getHungerDecaySince(lastFedAt: string): number {
  if (!lastFedAt) return 0;
  const then = new Date(lastFedAt).getTime();
  const now = Date.now();
  const hours = (now - then) / (1000 * 60 * 60);
  return Math.floor(hours * HUNGER_DECAY_PER_HOUR);
}

/** DB에서 펫 상태 불러온 뒤, 레벨에 맞게 growth_stage 동기화 + hunger decay + mood 재계산 */
export async function getDisplayPetState(userLevel: number): Promise<PetState> {
  let state = await petRepo.getPetState();
  const stage = getGrowthStageFromUserLevel(userLevel);
  if (state.growth_stage !== stage) {
    state = await petRepo.updatePetState({ growth_stage: stage });
  }

  const decay = getHungerDecaySince(state.last_fed_at || new Date(0).toISOString());
  if (decay > 0) {
    const newHunger = Math.max(0, state.hunger - decay);
    const newMood = computeMoodFromHunger(newHunger, state.last_fed_at || '');
    state = await petRepo.updatePetState({ hunger: newHunger, mood: newMood });
  } else if (state.mood === 'happy' && state.hunger < 80) {
    const newMood = computeMoodFromHunger(state.hunger, state.last_fed_at || '');
    if (newMood !== state.mood) state = await petRepo.updatePetState({ mood: newMood });
  }

  return state;
}

/** 먹이 주기: 인벤토리 1개 소비 + hunger 복구 + last_fed_at 갱신 */
export async function feedPetWithItem(
  itemId: string,
  hungerRestore: number
): Promise<{ success: boolean; newState?: PetState }> {
  const used = await inventoryRepo.useFood(itemId, 1);
  if (!used) return { success: false };
  const now = new Date().toISOString();
  const newState = await petRepo.feedPet(hungerRestore, now);
  return { success: true, newState };
}

export async function equipItem(slot: 'hat' | 'scarf' | 'background', itemId: string | null): Promise<void> {
  await petRepo.equipDecoration(slot, itemId);
}
