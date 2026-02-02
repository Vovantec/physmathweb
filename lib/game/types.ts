export interface Item {
  id: number | string;
  name: string;
  img: string;
  type: string; // "Шлем", "Меч" и т.д.
  pos: number;  // Позиция в инвентаре (0-14 экипировка, 15+ сумка)
  count?: number;
  description?: string;
  // Характеристики для тултипа
  strength?: number;
  agility?: number;
  intelligence?: number;
  endurance?: number;
  pdef?: number;
  damage?: number; // attack
}

// Константы слотов экипировки (для UI)
export const EQUIPMENT_SLOTS: Record<number, string> = {
  0: "head", 1: "chest", 2: "legs", 3: "gloves", 
  4: "belt", 5: "boots", 6: "weapon", 8: "bracers", 
  9: "shoulders", 10: "cape", 11: "ring", 12: "earring", 
  13: "necklace", 14: "offhand"
};

export interface DialogOption {
  id: number;
  text: string;
}

export interface DialogData {
  id: number;
  npcName: string;
  text: string;
  options: DialogOption[];
}