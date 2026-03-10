import { getDatabase } from './sqlite';
import type { OwnedFood } from '../types';

const TYPE_FOOD = 'food';
const TYPE_DECORATION = 'decoration';

export async function getOwnedFood(): Promise<OwnedFood> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ item_id: string; quantity: number }>(
    "SELECT item_id, quantity FROM inventory WHERE item_type = ? AND quantity > 0",
    [TYPE_FOOD]
  );
  const out: OwnedFood = {};
  for (const r of rows) out[r.item_id] = r.quantity;
  return out;
}

export async function getOwnedDecorationIds(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ item_id: string }>(
    "SELECT item_id FROM inventory WHERE item_type = ? AND quantity > 0",
    [TYPE_DECORATION]
  );
  return rows.map((r) => r.item_id);
}

export async function addFood(itemId: string, quantity: number): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ quantity: number }>(
    'SELECT quantity FROM inventory WHERE item_id = ? AND item_type = ?',
    [itemId, TYPE_FOOD]
  );
  if (existing) {
    await db.runAsync(
      'UPDATE inventory SET quantity = quantity + ? WHERE item_id = ? AND item_type = ?',
      [quantity, itemId, TYPE_FOOD]
    );
  } else {
    await db.runAsync(
      'INSERT INTO inventory (item_id, item_type, quantity) VALUES (?, ?, ?)',
      [itemId, TYPE_FOOD, quantity]
    );
  }
}

export async function useFood(itemId: string, count: number = 1): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ quantity: number }>(
    'SELECT quantity FROM inventory WHERE item_id = ? AND item_type = ?',
    [itemId, TYPE_FOOD]
  );
  if (!row || row.quantity < count) return false;
  const newQty = row.quantity - count;
  if (newQty <= 0) {
    await db.runAsync('DELETE FROM inventory WHERE item_id = ? AND item_type = ?', [itemId, TYPE_FOOD]);
  } else {
    await db.runAsync('UPDATE inventory SET quantity = ? WHERE item_id = ? AND item_type = ?', [newQty, itemId, TYPE_FOOD]);
  }
  return true;
}

export async function addDecoration(itemId: string): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ quantity: number }>(
    'SELECT quantity FROM inventory WHERE item_id = ? AND item_type = ?',
    [itemId, TYPE_DECORATION]
  );
  if (existing && existing.quantity > 0) return;
  if (existing) {
    await db.runAsync('UPDATE inventory SET quantity = 1 WHERE item_id = ? AND item_type = ?', [itemId, TYPE_DECORATION]);
  } else {
    await db.runAsync('INSERT INTO inventory (item_id, item_type, quantity) VALUES (?, ?, 1)', [itemId, TYPE_DECORATION]);
  }
}

export async function hasDecoration(itemId: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ quantity: number }>(
    'SELECT quantity FROM inventory WHERE item_id = ? AND item_type = ?',
    [itemId, TYPE_DECORATION]
  );
  return !!(row && row.quantity > 0);
}
