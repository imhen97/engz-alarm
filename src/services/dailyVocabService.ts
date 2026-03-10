import { getProgressValue, setProgressValue } from '../db/progressRepo';
import { VOCABULARY, VocabItem } from '../data/vocabulary';

const KEY_VOCAB_TARGET_DATE = 'vocab_target_date'; // YYYY-MM-DD (quiz date)
const KEY_VOCAB_WORDS = 'vocab_words'; // JSON: VocabItem[]
const KEY_VOCAB_STUDIED_AT = 'vocab_studied_at'; // ISO datetime (user confirmed study)
const KEY_VOCAB_QUIZ_PASSED_DATE = 'vocab_quiz_passed_date'; // YYYY-MM-DD

function toDateStringLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysLocal(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDailyWords(count: number): VocabItem[] {
  const all = Object.entries(VOCABULARY).map(([word, meaning_ko]) => ({ word, meaning_ko }));
  return shuffle(all).slice(0, Math.min(count, all.length));
}

export interface VocabSetState {
  targetDate: string; // quiz date
  words: VocabItem[];
  studiedAt: string | null;
  quizPassedDate: string | null;
}

export async function getVocabSetState(): Promise<VocabSetState | null> {
  const targetDate = await getProgressValue(KEY_VOCAB_TARGET_DATE);
  if (!targetDate) return null;
  const wordsRaw = await getProgressValue(KEY_VOCAB_WORDS);
  let words: VocabItem[] = [];
  try {
    words = wordsRaw ? (JSON.parse(wordsRaw) as VocabItem[]) : [];
  } catch {
    words = [];
  }
  const studiedAt = await getProgressValue(KEY_VOCAB_STUDIED_AT);
  const quizPassedDate = await getProgressValue(KEY_VOCAB_QUIZ_PASSED_DATE);
  return { targetDate, words, studiedAt, quizPassedDate };
}

/**
 * Night time: ensure tomorrow's 10-word set exists.
 * If target date changes, we reset study/pass markers.
 */
export async function getOrCreateTomorrowVocabSet(count: number = 10): Promise<{ targetDate: string; words: VocabItem[] }> {
  const tomorrow = toDateStringLocal(addDaysLocal(new Date(), 1));
  const state = await getVocabSetState();
  if (state?.targetDate === tomorrow && state.words.length > 0) {
    return { targetDate: state.targetDate, words: state.words };
  }

  const words = pickDailyWords(count);
  await setProgressValue(KEY_VOCAB_TARGET_DATE, tomorrow);
  await setProgressValue(KEY_VOCAB_WORDS, JSON.stringify(words));
  await setProgressValue(KEY_VOCAB_STUDIED_AT, '');
  await setProgressValue(KEY_VOCAB_QUIZ_PASSED_DATE, '');
  return { targetDate: tomorrow, words };
}

export async function markTomorrowVocabStudied(): Promise<void> {
  const tomorrow = toDateStringLocal(addDaysLocal(new Date(), 1));
  const targetDate = await getProgressValue(KEY_VOCAB_TARGET_DATE);
  if (targetDate !== tomorrow) {
    await getOrCreateTomorrowVocabSet(10);
  }
  await setProgressValue(KEY_VOCAB_STUDIED_AT, new Date().toISOString());
}

/**
 * Morning: if today's quiz is due, return its words.
 * Due 조건:
 * - targetDate === today
 * - studiedAt is not empty
 * - quizPassedDate !== today
 */
export async function getDueVocabQuizForToday(): Promise<{ targetDate: string; words: VocabItem[] } | null> {
  const today = toDateStringLocal(new Date());
  const state = await getVocabSetState();
  if (!state) return null;
  const studied = !!(state.studiedAt && state.studiedAt.trim().length > 0);
  const passedToday = state.quizPassedDate === today;
  if (state.targetDate !== today) return null;
  if (!studied) return null;
  if (passedToday) return null;
  if (!state.words || state.words.length === 0) return null;
  return { targetDate: state.targetDate, words: state.words };
}

export async function markVocabQuizPassedToday(): Promise<void> {
  const today = toDateStringLocal(new Date());
  await setProgressValue(KEY_VOCAB_QUIZ_PASSED_DATE, today);
}

