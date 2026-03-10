import * as coinRepo from '../db/coinRepo';

/** 알람 해제 성공 시 XP와 동일한 양만큼 코인 지급 (XP 1:1 코인) */
export async function grantCoinsOnSuccess(xpAmount: number): Promise<number> {
  return coinRepo.addCoins(xpAmount);
}

export async function getCoins(): Promise<number> {
  return coinRepo.getCoins();
}

export async function canAfford(coinCost: number): Promise<boolean> {
  return coinRepo.hasEnoughCoins(coinCost);
}

export async function spendCoins(amount: number): Promise<{ success: boolean; newBalance: number }> {
  return coinRepo.spendCoins(amount);
}
