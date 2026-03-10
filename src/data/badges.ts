export interface BadgeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const BADGES: BadgeDefinition[] = [
  { id: 'streak_3', name: '3일 연속', emoji: '🔥', description: '3일 연속 알람 해제' },
  { id: 'streak_7', name: '1주일 연속', emoji: '⚡', description: '7일 연속 알람 해제' },
  { id: 'streak_30', name: '한 달 연속', emoji: '🏆', description: '30일 연속 알람 해제' },
  { id: 'sentences_10', name: '첫 10문장', emoji: '📖', description: '10문장 읽기 성공' },
  { id: 'sentences_50', name: '50문장 마스터', emoji: '📚', description: '50문장 읽기 성공' },
  { id: 'sentences_100', name: '100문장 달성', emoji: '🎓', description: '100문장 읽기 성공' },
  { id: 'level_up', name: '첫 레벨업', emoji: '⬆️', description: '처음으로 레벨업 달성' },
  { id: 'level_max', name: '최고 레벨', emoji: '👑', description: 'Native Vibes 달성' },
  { id: 'perfect', name: '완벽한 발음', emoji: '💎', description: '100% 정확도 달성' },
  { id: 'all_packs', name: '다양한 학습', emoji: '🌍', description: '모든 팩 사용' },
];

export const MAX_LEVEL = 8;

export const XP_THRESHOLDS = [0, 30, 80, 160, 300, 500, 800, 1200];

export function getLevelFromXP(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= MAX_LEVEL) return XP_THRESHOLDS[MAX_LEVEL - 1];
  return XP_THRESHOLDS[currentLevel];
}

export function getXPForCurrentLevel(currentLevel: number): number {
  return XP_THRESHOLDS[Math.max(0, currentLevel - 1)];
}

interface LevelInfo {
  name: string;
  emoji: string;
  title: string;
  desc: string;
}

const LEVEL_DATA: Record<number, LevelInfo> = {
  1: { name: 'Baby Talker',        emoji: '🐣', title: 'Baby Talker',        desc: 'Hello, Hi 부터 시작해요!' },
  2: { name: 'Word Explorer',      emoji: '🔍', title: 'Word Explorer',      desc: '기본 단어를 탐험하는 중이에요' },
  3: { name: 'Sentence Builder',   emoji: '🧱', title: 'Sentence Builder',   desc: '간단한 문장을 만들 수 있어요' },
  4: { name: 'Small Talker',       emoji: '💬', title: 'Small Talker',       desc: '기초 회화가 가능해요' },
  5: { name: 'Conversation Maker', emoji: '🗣️', title: 'Conversation Maker', desc: '일상 대화를 할 수 있어요' },
  6: { name: 'Smooth Talker',      emoji: '😎', title: 'Smooth Talker',      desc: '자연스러운 표현을 구사해요' },
  7: { name: 'Free Talker',        emoji: '🦅', title: 'Free Talker',        desc: '자유롭게 의사소통해요' },
  8: { name: 'Native Vibes',       emoji: '🌟', title: 'Native Vibes',       desc: '원어민급 표현력이에요' },
};

export function getLevelLabel(level: number): string {
  return LEVEL_DATA[level]?.name ?? LEVEL_DATA[1].name;
}

export function getLevelEmoji(level: number): string {
  return LEVEL_DATA[level]?.emoji ?? LEVEL_DATA[1].emoji;
}

export function getLevelDesc(level: number): string {
  return LEVEL_DATA[level]?.desc ?? LEVEL_DATA[1].desc;
}

/** 메인 레벨 + 서브 레벨 표시 (예: "Word Explorer Lv2") */
export function getLevelWithSubLabel(mainLevel: number, subLevel: number): string {
  const name = getLevelLabel(mainLevel);
  return `${name} Lv${subLevel}`;
}
