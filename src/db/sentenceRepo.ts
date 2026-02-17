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
