import { getDatabase } from './sqlite';
import { Badge } from '../types';
import { getLevelFromXP } from '../data/badges';

export async function getProgressValue(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM user_progress WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setProgressValue(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO user_progress (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function getXP(): Promise<number> {
  const val = await getProgressValue('xp');
  return val ? parseInt(val, 10) : 0;
}

export async function addXP(amount: number): Promise<{ newXP: number; oldLevel: number; newLevel: number }> {
  const oldXP = await getXP();
  const oldLevel = getLevelFromXP(oldXP);
  const newXP = oldXP + amount;
  await setProgressValue('xp', newXP.toString());

  const newLevel = getLevelFromXP(newXP);
  return { newXP, oldLevel, newLevel };
}

export async function getTotalCorrect(): Promise<number> {
  const val = await getProgressValue('total_correct');
  return val ? parseInt(val, 10) : 0;
}

export async function incrementTotalCorrect(): Promise<number> {
  const current = await getTotalCorrect();
  const newVal = current + 1;
  await setProgressValue('total_correct', newVal.toString());
  return newVal;
}

export async function getTotalAttempts(): Promise<number> {
  const val = await getProgressValue('total_attempts');
  return val ? parseInt(val, 10) : 0;
}

export async function incrementTotalAttempts(): Promise<number> {
  const current = await getTotalAttempts();
  const newVal = current + 1;
  await setProgressValue('total_attempts', newVal.toString());
  return newVal;
}

// Badge functions
export async function getUnlockedBadges(): Promise<Badge[]> {
  const db = await getDatabase();
  return db.getAllAsync<Badge>('SELECT * FROM badges ORDER BY unlocked_at DESC');
}

export async function isBadgeUnlocked(badgeId: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM badges WHERE id = ?',
    [badgeId]
  );
  return !!row;
}

export async function unlockBadge(badgeId: string): Promise<boolean> {
  const already = await isBadgeUnlocked(badgeId);
  if (already) return false;

  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT OR IGNORE INTO badges (id, unlocked_at) VALUES (?, ?)',
    [badgeId, now]
  );
  return true;
}

export async function getWeeklyAccuracy(): Promise<{ date: string; accuracy: number }[]> {
  const db = await getDatabase();
  const results: { date: string; accuracy: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const row = await db.getFirstAsync<{ total: number; correct: number }>(
      `SELECT COUNT(*) as total, SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as correct
       FROM sentence_history
       WHERE date(attempted_at) = ?`,
      [dateStr]
    );

    results.push({
      date: dateStr,
      accuracy: row && row.total > 0 ? (row.correct / row.total) * 100 : 0,
    });
  }

  return results;
}

export async function getUsedPacks(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ pack_id: string }>(
    `SELECT DISTINCT s.pack_id FROM sentence_history sh
     JOIN sentences s ON sh.sentence_id = s.id
     WHERE sh.success = 1`
  );
  return rows.map((r) => r.pack_id);
}

// ---- Learning gauge & review quiz ----
const KEY_LEARNING_GAUGE = 'learning_gauge';
const KEY_CYCLE_LEARNED_IDS = 'cycle_learned_ids';

export async function getLearningGauge(): Promise<number> {
  const val = await getProgressValue(KEY_LEARNING_GAUGE);
  const n = val ? parseInt(val, 10) : 0;
  return Number.isNaN(n) ? 0 : Math.min(5, Math.max(0, n));
}

export async function getCycleLearnedIds(): Promise<number[]> {
  const val = await getProgressValue(KEY_CYCLE_LEARNED_IDS);
  if (!val) return [];
  try {
    const arr = JSON.parse(val) as number[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** sentence_history에 이 문장의 성공 기록이 이미 있는지 (이번 시도 제외) */
export async function hadSuccessBefore(sentenceId: number): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM sentence_history WHERE sentence_id = ? AND success = 1',
    [sentenceId]
  );
  return (row?.cnt ?? 0) > 0;
}

/** 새로 배운 표현 1개 추가. 첫 성공 시에만 호출 (recordAttempt 직후, hadSuccessBefore가 false였을 때) */
export async function addNewLearnedSentence(sentenceId: number): Promise<{ gauge: number; shouldTriggerQuiz: boolean }> {
  const ids = await getCycleLearnedIds();
  if (ids.includes(sentenceId)) {
    const gauge = await getLearningGauge();
    return { gauge, shouldTriggerQuiz: false };
  }
  const newIds = [...ids, sentenceId].slice(-5);
  await setProgressValue(KEY_CYCLE_LEARNED_IDS, JSON.stringify(newIds));
  const gauge = newIds.length;
  await setProgressValue(KEY_LEARNING_GAUGE, gauge.toString());
  return { gauge, shouldTriggerQuiz: gauge >= 5 };
}

export async function resetLearningCycle(): Promise<void> {
  await setProgressValue(KEY_LEARNING_GAUGE, '0');
  await setProgressValue(KEY_CYCLE_LEARNED_IDS, '[]');
}

/** 성공한 적 있는 sentence_id 목록 (최근 순, 상위 limit개) */
export async function getLearnedSentenceIds(limit: number = 30): Promise<number[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ sentence_id: number }>(
    `SELECT sentence_id FROM sentence_history WHERE success = 1
     GROUP BY sentence_id ORDER BY MAX(attempted_at) DESC LIMIT ?`,
    [limit]
  );
  return rows.map((r) => r.sentence_id);
}
