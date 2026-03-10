import { getDatabase } from './sqlite';
import type { PetState, PetGrowthStage, PetMood } from '../types';

const PET_ROW_ID = 1;

const DEFAULT_PET: PetState = {
  growth_stage: 'puppy',
  hunger: 80,
  mood: 'normal',
  last_fed_at: '',
  equipped_hat_id: null,
  equipped_scarf_id: null,
  equipped_background_id: null,
};

function rowToPet(row: {
  growth_stage: string;
  hunger: number;
  mood: string;
  last_fed_at: string | null;
  equipped_hat_id: string | null;
  equipped_scarf_id: string | null;
  equipped_background_id: string | null;
}): PetState {
  return {
    growth_stage: (row.growth_stage as PetGrowthStage) || 'puppy',
    hunger: Math.min(100, Math.max(0, row.hunger ?? 80)),
    mood: (row.mood as PetMood) || 'normal',
    last_fed_at: row.last_fed_at ?? '',
    equipped_hat_id: row.equipped_hat_id ?? null,
    equipped_scarf_id: row.equipped_scarf_id ?? null,
    equipped_background_id: row.equipped_background_id ?? null,
  };
}

export async function getPetState(): Promise<PetState> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    growth_stage: string;
    hunger: number;
    mood: string;
    last_fed_at: string | null;
    equipped_hat_id: string | null;
    equipped_scarf_id: string | null;
    equipped_background_id: string | null;
  }>('SELECT * FROM pet_state WHERE id = ?', [PET_ROW_ID]);

  if (row) return rowToPet(row);

  await db.runAsync(
    `INSERT INTO pet_state (id, growth_stage, hunger, mood, last_fed_at, equipped_hat_id, equipped_scarf_id, equipped_background_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      PET_ROW_ID,
      DEFAULT_PET.growth_stage,
      DEFAULT_PET.hunger,
      DEFAULT_PET.mood,
      DEFAULT_PET.last_fed_at || null,
      null,
      null,
      null,
    ]
  );
  return { ...DEFAULT_PET };
}

export async function updatePetState(updates: Partial<PetState>): Promise<PetState> {
  const current = await getPetState();
  const next: PetState = {
    ...current,
    ...updates,
    hunger: updates.hunger !== undefined ? Math.min(100, Math.max(0, updates.hunger)) : current.hunger,
  };

  const db = await getDatabase();
  await db.runAsync(
    `UPDATE pet_state SET
       growth_stage = ?, hunger = ?, mood = ?, last_fed_at = ?,
       equipped_hat_id = ?, equipped_scarf_id = ?, equipped_background_id = ?
     WHERE id = ?`,
    [
      next.growth_stage,
      next.hunger,
      next.mood,
      next.last_fed_at || null,
      next.equipped_hat_id || null,
      next.equipped_scarf_id || null,
      next.equipped_background_id || null,
      PET_ROW_ID,
    ]
  );
  return next;
}

export async function setGrowthStage(stage: PetGrowthStage): Promise<void> {
  await updatePetState({ growth_stage: stage });
}

export async function setHunger(hunger: number): Promise<void> {
  await updatePetState({ hunger: Math.min(100, Math.max(0, hunger)) });
}

export async function setMood(mood: PetMood): Promise<void> {
  await updatePetState({ mood });
}

export async function feedPet(hungerRestore: number, lastFedAt: string): Promise<PetState> {
  const current = await getPetState();
  const newHunger = Math.min(100, current.hunger + hungerRestore);
  return updatePetState({ hunger: newHunger, last_fed_at: lastFedAt, mood: 'happy' });
}

export async function equipDecoration(slot: 'hat' | 'scarf' | 'background', itemId: string | null): Promise<void> {
  const current = await getPetState();
  const updates: Partial<PetState> = {};
  if (slot === 'hat') updates.equipped_hat_id = itemId;
  if (slot === 'scarf') updates.equipped_scarf_id = itemId;
  if (slot === 'background') updates.equipped_background_id = itemId;
  await updatePetState(updates);
}
