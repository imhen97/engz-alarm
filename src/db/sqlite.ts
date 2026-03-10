import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('engz_alarm.db');
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      repeat_mask INTEGER NOT NULL DEFAULT 0,
      label TEXT NOT NULL DEFAULT '',
      unlock_mode TEXT NOT NULL DEFAULT 'voice',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sentences (
      id INTEGER PRIMARY KEY,
      text TEXT NOT NULL,
      meaning_ko TEXT NOT NULL DEFAULT '',
      pack_id TEXT NOT NULL DEFAULT 'morning_basics',
      difficulty INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS streak_records (
      date TEXT PRIMARY KEY,
      completed INTEGER NOT NULL DEFAULT 0,
      sentence_text TEXT
    );

    CREATE TABLE IF NOT EXISTS sentence_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sentence_id INTEGER NOT NULL,
      success INTEGER NOT NULL,
      score REAL NOT NULL,
      attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_progress (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      unlocked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pet_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      growth_stage TEXT NOT NULL DEFAULT 'puppy',
      hunger INTEGER NOT NULL DEFAULT 80,
      mood TEXT NOT NULL DEFAULT 'normal',
      last_fed_at TEXT,
      equipped_hat_id TEXT,
      equipped_scarf_id TEXT,
      equipped_background_id TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory (
      item_id TEXT PRIMARY KEY,
      item_type TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Migration: add meaning_ko column if upgrading from old schema
  try {
    await database.execAsync(
      `ALTER TABLE sentences ADD COLUMN meaning_ko TEXT NOT NULL DEFAULT ''`
    );
  } catch {
    // Column already exists — ignore
  }

  // Re-seed sentences so meaning_ko values are populated
  const row = await database.getFirstAsync<{ mk: string }>(
    `SELECT meaning_ko as mk FROM sentences WHERE id = 1`
  );
  if (row && !row.mk) {
    // Old data without Korean meanings — drop and let app re-insert
    await database.execAsync(`DELETE FROM sentences`);
  }
}
