import { Sentence } from '../types';
import { getSentenceCount, insertSentences, getRandomSentence } from '../db/sentenceRepo';
import sentencesData from '../data/sentences.json';

export async function initializeSentences(): Promise<void> {
  const count = await getSentenceCount();
  if (count === 0) {
    await insertSentences(sentencesData as Sentence[]);
  }
}

export async function fetchRandomSentence(): Promise<Sentence> {
  const sentence = await getRandomSentence();
  if (sentence) return sentence;

  // Fallback if DB is empty
  return {
    id: 1,
    text: 'Today will be a great day',
    pack_id: 'morning_basics',
    difficulty: 1,
  };
}
