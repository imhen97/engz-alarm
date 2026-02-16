import { getDatabase } from './sqlite';
import { Alarm, UnlockMode } from '../types';

export async function getAllAlarms(): Promise<Alarm[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    hour: number;
    minute: number;
    repeat_mask: number;
    label: string;
    unlock_mode: string;
    is_active: number;
    created_at: string;
  }>('SELECT * FROM alarms ORDER BY hour, minute');

  return rows.map((row) => ({
    ...row,
    unlock_mode: row.unlock_mode as UnlockMode,
    is_active: row.is_active === 1,
  }));
}

export async function getAlarmById(id: string): Promise<Alarm | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    hour: number;
    minute: number;
    repeat_mask: number;
    label: string;
    unlock_mode: string;
    is_active: number;
    created_at: string;
  }>('SELECT * FROM alarms WHERE id = ?', [id]);

  if (!row) return null;
  return {
    ...row,
    unlock_mode: row.unlock_mode as UnlockMode,
    is_active: row.is_active === 1,
  };
}

export async function insertAlarm(alarm: Alarm): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO alarms (id, hour, minute, repeat_mask, label, unlock_mode, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      alarm.id,
      alarm.hour,
      alarm.minute,
      alarm.repeat_mask,
      alarm.label,
      alarm.unlock_mode,
      alarm.is_active ? 1 : 0,
      alarm.created_at,
    ]
  );
}

export async function updateAlarm(alarm: Alarm): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE alarms SET hour=?, minute=?, repeat_mask=?, label=?, unlock_mode=?, is_active=? WHERE id=?',
    [
      alarm.hour,
      alarm.minute,
      alarm.repeat_mask,
      alarm.label,
      alarm.unlock_mode,
      alarm.is_active ? 1 : 0,
      alarm.id,
    ]
  );
}

export async function deleteAlarm(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM alarms WHERE id = ?', [id]);
}

export async function toggleAlarm(id: string, isActive: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE alarms SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
}
