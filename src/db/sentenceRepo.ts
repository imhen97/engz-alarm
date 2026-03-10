import { getDatabase } from './sqlite';
import { Sentence } from '../types';

export async function getSentenceCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sentences'
  );
  return result?.count ?? 0;
}

export async function insertSentences(sentences: Sentence[]): Promise<void> {
  const db = await getDatabase();
  for (const s of sentences) {
    await db.runAsync(
      'INSERT OR REPLACE INTO sentences (id, text, meaning_ko, pack_id, difficulty) VALUES (?, ?, ?, ?, ?)',
      [s.id, s.text, s.meaning_ko, s.pack_id, s.difficulty]
    );
  }
}

export async function getRandomSentence(): Promise<Sentence | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Sentence>(
    'SELECT * FROM sentences ORDER BY RANDOM() LIMIT 1'
  );
  return row ?? null;
}

export async function getSentencesByPack(packId: string): Promise<Sentence[]> {
  const db = await getDatabase();
  return db.getAllAsync<Sentence>(
    'SELECT * FROM sentences WHERE pack_id = ?',
    [packId]
  );
}

/** 여러 팩에서 문장 가져오기 (퀴즈 오답 풀 등) */
export async function getSentencesByPacks(
  packIds: string[],
  limit: number = 100
): Promise<Sentence[]> {
  if (packIds.length === 0) return [];
  const db = await getDatabase();
  const placeholders = packIds.map(() => '?').join(',');
  return db.getAllAsync<Sentence>(
    `SELECT * FROM sentences WHERE pack_id IN (${placeholders}) ORDER BY RANDOM() LIMIT ?`,
    [...packIds, limit]
  );
}

export async function getSentencesByIds(ids: number[]): Promise<Sentence[]> {
  if (ids.length === 0) return [];
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  return db.getAllAsync<Sentence>(
    `SELECT * FROM sentences WHERE id IN (${placeholders})`,
    ids
  );
}

export async function recordAttempt(
  sentenceId: number,
  success: boolean,
  score: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO sentence_history (sentence_id, success, score, attempted_at) VALUES (?, ?, ?, datetime("now"))',
    [sentenceId, success ? 1 : 0, score]
  );
}

export async function getRecentSuccessRate(limit: number = 5): Promise<number> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ success: number }>(
    'SELECT success FROM sentence_history ORDER BY attempted_at DESC LIMIT ?',
    [limit]
  );
  if (rows.length === 0) return 0.5;
  const total = rows.reduce((sum, r) => sum + r.success, 0);
  return total / rows.length;
}

export async function getRecentSentenceIds(limit: number = 20): Promise<number[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ sentence_id: number }>(
    'SELECT DISTINCT sentence_id FROM sentence_history ORDER BY attempted_at DESC LIMIT ?',
    [limit]
  );
  return rows.map((r) => r.sentence_id);
}

/**
 * 지금까지 한 번이라도 나왔던(시도된) 문장 ID 목록.
 * 이전에 나온 문장이 다시 겹쳐 나오지 않도록 제외용으로 사용.
 */
export async function getAllAttemptedSentenceIds(): Promise<number[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ sentence_id: number }>(
    'SELECT DISTINCT sentence_id FROM sentence_history'
  );
  return rows.map((r) => r.sentence_id);
}

/**
 * 최근 N일(당일 포함) 동안 sentence_history에 기록된 문장 ID 목록 (중복 제거).
 * 누적 퀴즈 풀 구성용.
 */
export async function getSentenceIdsFromLastDays(days: number): Promise<number[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ sentence_id: number }>(
    `SELECT DISTINCT sentence_id FROM sentence_history
     WHERE date(attempted_at) >= date('now', '-' || ? || ' days')
     ORDER BY sentence_id`,
    [Math.max(1, Math.min(31, days))]
  );
  return rows.map((r) => r.sentence_id);
}

/**
 * 레벨(1~8)별로 추천 문장 난이도 범위 [min, max]와 기본 난이도.
 * 각 레벨에 맞는 문장만 제공되도록 이 범위를 벗어나지 않음.
 */
const LEVEL_DIFFICULTY_BAND: { min: number; max: number; base: number }[] = [
  { min: 1, max: 1, base: 1 }, // 1 Baby Talker
  { min: 1, max: 1, base: 1 }, // 2 Word Explorer
  { min: 1, max: 2, base: 1 }, // 3 Sentence Builder
  { min: 1, max: 2, base: 2 }, // 4 Small Talker
  { min: 2, max: 3, base: 2 }, // 5 Conversation Maker
  { min: 2, max: 3, base: 2 }, // 6 Smooth Talker
  { min: 3, max: 3, base: 3 }, // 7 Free Talker
  { min: 3, max: 3, base: 3 }, // 8 Native Vibes
];

function getDifficultyForLevel(userLevel: number, successRate: number): number {
  const level = Math.min(8, Math.max(1, userLevel));
  const band = LEVEL_DIFFICULTY_BAND[level - 1];
  let target = band.base;
  if (successRate >= 0.8 && band.base < band.max) {
    target = band.base + 1;
  } else if (successRate <= 0.4 && band.base > band.min) {
    target = band.base - 1;
  }
  return Math.min(band.max, Math.max(band.min, target));
}

export async function getAdaptiveSentence(
  userLevel: number,
  selectedPacks: string[],
  excludeIds: number[] = []
): Promise<Sentence | null> {
  const db = await getDatabase();

  const successRate = await getRecentSuccessRate(5);
  const level = Math.min(8, Math.max(1, userLevel));
  const band = LEVEL_DIFFICULTY_BAND[level - 1];
  const targetDifficulty = getDifficultyForLevel(userLevel, successRate);

  const attemptedIds = await getAllAttemptedSentenceIds();
  const allExclude = [...new Set([...attemptedIds, ...excludeIds])];

  if (selectedPacks.length === 0) {
    selectedPacks = ['morning_basics'];
  }

  const packPlaceholders = selectedPacks.map(() => '?').join(',');

  // 1) 레벨 범위 내에서 목표 난이도 문장 우선
  if (allExclude.length > 0) {
    const idPlaceholders = allExclude.map(() => '?').join(',');
    const row = await db.getFirstAsync<Sentence>(
      `SELECT * FROM sentences WHERE pack_id IN (${packPlaceholders}) AND difficulty = ? AND id NOT IN (${idPlaceholders}) ORDER BY RANDOM() LIMIT 1`,
      [...selectedPacks, targetDifficulty, ...allExclude]
    );
    if (row) return row;
  } else {
    const row = await db.getFirstAsync<Sentence>(
      `SELECT * FROM sentences WHERE pack_id IN (${packPlaceholders}) AND difficulty = ? ORDER BY RANDOM() LIMIT 1`,
      [...selectedPacks, targetDifficulty]
    );
    if (row) return row;
  }

  // 2) 같은 레벨 범위(band) 내 다른 난이도로 폴백
  if (allExclude.length > 0) {
    const idPlaceholders = allExclude.map(() => '?').join(',');
    const row = await db.getFirstAsync<Sentence>(
      `SELECT * FROM sentences WHERE pack_id IN (${packPlaceholders}) AND difficulty >= ? AND difficulty <= ? AND id NOT IN (${idPlaceholders}) ORDER BY RANDOM() LIMIT 1`,
      [...selectedPacks, band.min, band.max, ...allExclude]
    );
    if (row) return row;
  }
  const rowFallback = await db.getFirstAsync<Sentence>(
    `SELECT * FROM sentences WHERE pack_id IN (${packPlaceholders}) AND difficulty >= ? AND difficulty <= ? ORDER BY RANDOM() LIMIT 1`,
    [...selectedPacks, band.min, band.max]
  );
  return rowFallback ?? null;
}

/** 오늘 배울 N개 문장을 적응형으로 선택 (중복 없음) */
export async function getAdaptiveSentences(
  userLevel: number,
  selectedPacks: string[],
  count: number
): Promise<Sentence[]> {
  const result: Sentence[] = [];
  const excludeIds: number[] = [];
  for (let i = 0; i < count; i++) {
    const s = await getAdaptiveSentence(userLevel, selectedPacks, excludeIds);
    if (!s) break;
    result.push(s);
    excludeIds.push(s.id);
  }
  return result;
}
