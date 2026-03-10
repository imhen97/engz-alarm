// Alarm types
export type UnlockMode = 'voice' | 'typing';

export interface Alarm {
  id: string;
  hour: number;
  minute: number;
  repeat_mask: number; // bitmask: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64
  label: string;
  unlock_mode: UnlockMode;
  is_active: boolean;
  created_at: string;
}

export interface Sentence {
  id: number;
  text: string;
  meaning_ko: string;
  pack_id: string;
  difficulty: number; // 1=easy, 2=medium, 3=hard
}

export interface Settings {
  default_unlock_mode: UnlockMode;
  snooze_enabled: boolean;
  snooze_minutes: number;
  user_level: number;       // 1~8 (Baby Talker ~ Native Vibes)
  sub_level: number;        // 학습 티어 (복습 퀴즈 통과 시 +1, Word Explorer Lv2 등)
  selected_packs: string[]; // 선택된 팩 ID 배열
  user_xp: number;          // 경험치
  user_coins: number;       // 캐시 (먹이/꾸미기 구매)
  test_completed: boolean;  // 레벨 테스트 완료 여부
  night_input_time?: string; // Night Input 알림 시간 (예: "22:00" 또는 "off")
  daily_new_sentences?: number; // 하루에 새로 배울 문장 수 (1, 2, 3)
  pet_last_fed?: string;    // 마지막 밥 시간 ISO (기분 계산용)
  pet_accessories?: string[]; // 장착한 장식 id 배열 (hat, scarf 등)
  owned_decorations?: string[]; // 구매한 장식 id (상점/인벤토리)
}

/** 복습 퀴즈 1문항 (배운 표현 뜻 맞추기) */
export interface ReviewQuizItem {
  sentence: Sentence;
  options: string[];   // meaning_ko 4개 (1 정답 + 3 오답)
  correctIndex: number;
}

export interface Badge {
  id: string;
  unlocked_at: string;
}

export interface LevelTestQuestion {
  id: number;
  type: 'meaning' | 'fill';
  difficulty: number;
  sentence: string;
  question_ko: string;
  options: string[];
  correct_answer: string;
}

export interface SentenceHistory {
  id: number;
  sentence_id: number;
  success: boolean;
  score: number;
  attempted_at: string;
}

// Voice recognition states
export type VoiceState = 'idle' | 'listening' | 'processing' | 'success' | 'fail';

// Days of week
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export type DayOfWeek = typeof DAYS[number];

// ---- Pet & Shop (AI 강아지 + 캐시) ----

/** 강아지 성장 단계 (사용자 레벨에 연동) */
export type PetGrowthStage = 'puppy' | 'teen' | 'adult' | 'hero';

/** 강아지 기분 (hunger·시간 기반 계산) */
export type PetMood = 'happy' | 'normal' | 'hungry' | 'sleepy';

export interface PetState {
  growth_stage: PetGrowthStage;
  hunger: number;       // 0~100
  mood: PetMood;
  last_fed_at: string;  // ISO datetime
  equipped_hat_id: string | null;
  equipped_scarf_id: string | null;
  equipped_background_id: string | null;
}

/** 장식 슬롯 */
export type DecorationSlot = 'hat' | 'scarf' | 'background';

/** 상점 아이템 공통 */
export interface ShopItemBase {
  id: string;
  name_ko: string;
  emoji: string;
  coin_cost: number;
}

/** 먹이 아이템 */
export interface FoodItem extends ShopItemBase {
  type: 'food';
  hunger_restore: number;
}

/** 장식 아이템 */
export interface DecorationItem extends ShopItemBase {
  type: 'decoration';
  slot: DecorationSlot;
}

export type ShopItem = FoodItem | DecorationItem;

/** 인벤토리: 먹이 보유 (item_id -> quantity) */
export type OwnedFood = Record<string, number>;

/** 인벤토리: 장식 보유 (item_id[]) */
export type OwnedDecorations = string[];
