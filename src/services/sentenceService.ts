import { Sentence } from '../types';
import {
  getSentenceCount,
  insertSentences,
  getRandomSentence,
  getAdaptiveSentence,
} from '../db/sentenceRepo';
import sentencesData from '../data/sentences.json';

const EXPECTED_SENTENCE_COUNT = 500;

export async function initializeSentences(): Promise<void> {
  const count = await getSentenceCount();
  if (count < EXPECTED_SENTENCE_COUNT) {
    await insertSentences(sentencesData as Sentence[]);
  }
}

export async function fetchRandomSentence(): Promise<Sentence> {
  const sentence = await getRandomSentence();
  if (sentence) return sentence;

  return FALLBACK_SENTENCE;
}

export async function fetchAdaptiveSentence(
  userLevel: number,
  selectedPacks: string[]
): Promise<Sentence> {
  const sentence = await getAdaptiveSentence(userLevel, selectedPacks);
  if (sentence) return sentence;

  const fallback = await getRandomSentence();
  if (fallback) return fallback;

  return FALLBACK_SENTENCE;
}

const FALLBACK_SENTENCE: Sentence = {
  id: 1,
  text: 'Today will be a great day',
  meaning_ko: '오늘은 멋진 하루가 될 거야',
  pack_id: 'morning_basics',
  difficulty: 1,
};
