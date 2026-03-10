import { Settings } from '../types';
import { getDatabase } from '../db/sqlite';
import { getAdaptiveSentences, getSentencesByIds } from '../db/sentenceRepo';
import { Sentence } from '../types';

const DAILY_SENTENCES_KEY = 'daily_sentences';

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface DailySentencesPayload {
  date: string;
  sentenceIds: number[];
}

async function getDailySentencesFromDB(): Promise<DailySentencesPayload | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [DAILY_SENTENCES_KEY]
  );
  if (!row?.value) return null;
  try {
    const parsed = JSON.parse(row.value) as DailySentencesPayload;
    if (parsed?.date && Array.isArray(parsed.sentenceIds)) return parsed;
  } catch {
    // ignore
  }
  return null;
}

async function setDailySentencesToDB(date: string, sentenceIds: number[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [DAILY_SENTENCES_KEY, JSON.stringify({ date, sentenceIds })]
  );
}

/**
 * 자정(00:00)이 지났는지 확인하고, 지났으면 오늘의 문장을 강제로 새로 선택합니다.
 * 앱이 포그라운드에 있을 때 주기적으로 호출하여 자정 업데이트를 처리합니다.
 */
export async function checkAndUpdateAtMidnight(settings: Settings): Promise<boolean> {
  const today = getTodayDateString();
  const stored = await getDailySentencesFromDB();

  // 저장된 날짜가 오늘과 다르면 (자정이 지났으면) 새로 선택
  if (stored?.date && stored.date !== today) {
    const n = Math.min(3, Math.max(1, settings.daily_new_sentences ?? 2));
    const sentences = await getAdaptiveSentences(
      settings.user_level,
      settings.selected_packs,
      n
    );

    if (sentences.length > 0) {
      await setDailySentencesToDB(today, sentences.map((s) => s.id));
      return true; // 업데이트됨
    }
  }

  return false; // 업데이트 불필요
}

/**
 * 오늘의 문장 세트를 반환합니다.
 * 오늘 날짜로 이미 저장된 문장이 있으면 그대로 반환하고,
 * 없거나 날짜가 바뀌었으면 설정된 개수(1~3)만큼 새로 뽑아 저장 후 반환합니다.
 * Night Input과 모든 알람(아침·추가)에서 동일한 세트를 사용합니다.
 * 매일 자정(00:00)에 자동으로 새로운 문장으로 업데이트됩니다.
 */
export async function getOrCreateDailySentences(settings: Settings): Promise<Sentence[]> {
  const today = getTodayDateString();
  const stored = await getDailySentencesFromDB();

  if (stored?.date === today && stored.sentenceIds.length > 0) {
    const sentences = await getSentencesByIds(stored.sentenceIds);
    if (sentences.length > 0) {
      return sentences;
    }
  }

  const n = Math.min(3, Math.max(1, settings.daily_new_sentences ?? 2));
  const sentences = await getAdaptiveSentences(
    settings.user_level,
    settings.selected_packs,
    n
  );

  if (sentences.length > 0) {
    await setDailySentencesToDB(today, sentences.map((s) => s.id));
  }

  return sentences;
}

/** 오늘의 문장 세트에서 랜덤으로 1개 선택 (알람 해제용) */
export function pickOneFromDaily(dailySentences: Sentence[]): Sentence | null {
  if (dailySentences.length === 0) return null;
  return dailySentences[Math.floor(Math.random() * dailySentences.length)];
}
