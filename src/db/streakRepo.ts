import { getDatabase } from './sqlite';

export interface StreakRecord {
  date: string;
  completed: boolean;
  sentence_text?: string;
}

export async function recordStreak(date: string, sentenceText: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO streak_records (date, completed, sentence_text) VALUES (?, 1, ?)`,
    [date, sentenceText]
  );
}

export async function getStreakRecords(startDate: string, endDate: string): Promise<StreakRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<StreakRecord>(
    `SELECT date, completed, sentence_text FROM streak_records WHERE date >= ? AND date <= ? ORDER BY date DESC`,
    [startDate, endDate]
  );
  return rows;
}

export async function getAllStreakRecords(): Promise<StreakRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<StreakRecord>(
    `SELECT date, completed, sentence_text FROM streak_records ORDER BY date DESC`
  );
  return rows;
}

export async function getCurrentStreak(): Promise<number> {
  const records = await getAllStreakRecords();
  if (records.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    const found = records.find((r) => r.date === dateStr && r.completed);
    if (found) {
      streak++;
    } else {
      if (i === 0) continue;
      break;
    }
  }

  return streak;
}

export async function getMonthlyCount(year: number, month: number): Promise<number> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM streak_records WHERE date >= ? AND date <= ? AND completed = 1`,
    [startDate, endDate]
  );
  return result?.count ?? 0;
}

export async function getRecentSentences(limit: number = 5): Promise<StreakRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<StreakRecord>(
    `SELECT date, completed, sentence_text FROM streak_records WHERE completed = 1 AND sentence_text IS NOT NULL ORDER BY date DESC LIMIT ?`,
    [limit]
  );
  return rows;
}
