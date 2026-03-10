import { getProgressValue, setProgressValue } from './progressRepo';

const COINS_KEY = 'coins';

export async function getCoins(): Promise<number> {
  const val = await getProgressValue(COINS_KEY);
  const n = val ? parseInt(val, 10) : 0;
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

export async function addCoins(amount: number): Promise<number> {
  const current = await getCoins();
  const next = current + amount;
  await setProgressValue(COINS_KEY, next.toString());
  return next;
}

export async function spendCoins(amount: number): Promise<{ success: boolean; newBalance: number }> {
  const current = await getCoins();
  if (current < amount) return { success: false, newBalance: current };
  const next = current - amount;
  await setProgressValue(COINS_KEY, next.toString());
  return { success: true, newBalance: next };
}

export async function hasEnoughCoins(amount: number): Promise<boolean> {
  const coins = await getCoins();
  return coins >= amount;
}
