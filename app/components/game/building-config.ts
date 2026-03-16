// ============================================================
// ЕДИНЫЙ КОНФИГ ЗДАНИЙ — используется и на сервере и на клиенте
// ============================================================

export type ResourceType = "money" | "steel" | "fuel" | "uranium";

export interface ResourceCost {
  money?:   number;
  steel?:   number;
  fuel?:    number;
  uranium?: number;
}

export interface BuildingLevel {
  hp:          number;
  buildTime:   number;   // секунды
  cost:        ResourceCost;
  income?:     Partial<Record<ResourceType, number>>; // доход в тик (каждые 10 сек)
  radarRadius? : number; // радиус обзора в клетках
  missileDamage?: number;
  missileRange?:  number;
  pvoChance?:     number; // шанс сбития ракеты 0-1
  storageBonus?:  number; // доп. лимит хранения
  description: string;
}

export interface BuildingConfig {
  id:          string;
  label:       string;
  icon:        string;
  category:    "economy" | "military" | "defense" | "special";
  maxPerBase:  number;
  requires?:   string[];  // id зданий-зависимостей
  levels:      [BuildingLevel, BuildingLevel, BuildingLevel]; // всегда 3 уровня
}

// ============================================================
// ЛИМИТЫ ХРАНЕНИЯ РЕСУРСОВ (базовые)
// ============================================================
export const BASE_STORAGE: Record<ResourceType, number> = {
  money:   5000,
  steel:   3000,
  fuel:    2000,
  uranium: 500,
};

// ============================================================
// КОНФИГ 10 ЗДАНИЙ
// ============================================================
export const BUILDINGS: Record<string, BuildingConfig> = {

  // ── КОМАНДНЫЙ БУНКЕР ──────────────────────────────────────
  command_bunker: {
    id: "command_bunker", label: "Командный бункер",
    icon: "🏛️", category: "special", maxPerBase: 1,
    levels: [
      { hp: 2000, buildTime: 0,   cost: {},
        income: { money: 5 },
        description: "Сердце базы. Нельзя уничтожить полностью." },
      { hp: 4000, buildTime: 120, cost: { money: 1000, steel: 500 },
        income: { money: 10 },
        description: "Укреплённый бункер. +100% HP, +5 денег/тик." },
      { hp: 8000, buildTime: 300, cost: { money: 3000, steel: 1500, uranium: 50 },
        income: { money: 20 },
        description: "Форт-Нокс. Максимальная защита штаба." },
    ],
  },

  // ── КАЗАРМЫ ───────────────────────────────────────────────
  barracks: {
    id: "barracks", label: "Казармы",
    icon: "🏠", category: "economy", maxPerBase: 3,
    requires: ["command_bunker"],
    levels: [
      { hp: 500, buildTime: 30,  cost: { money: 200, steel: 100 },
        income: { money: 15 },
        description: "Базовые казармы. +15 денег каждые 10 сек." },
      { hp: 800, buildTime: 90,  cost: { money: 600, steel: 300 },
        income: { money: 35 },
        description: "Расширенные казармы. +35 денег/тик." },
      { hp: 1200, buildTime: 180, cost: { money: 1500, steel: 700 },
        income: { money: 70 },
        description: "Элитные казармы. +70 денег/тик." },
    ],
  },

  // ── НЕФТЯНАЯ ВЫШКА ────────────────────────────────────────
  oil_rig: {
    id: "oil_rig", label: "Нефтяная вышка",
    icon: "🛢️", category: "economy", maxPerBase: 2,
    requires: ["command_bunker"],
    levels: [
      { hp: 400, buildTime: 45,  cost: { money: 300, steel: 150 },
        income: { fuel: 10 },
        description: "Добывает топливо. +10 топлива/тик." },
      { hp: 700, buildTime: 120, cost: { money: 800, steel: 400 },
        income: { fuel: 25 },
        description: "Глубокое бурение. +25 топлива/тик." },
      { hp: 1000, buildTime: 240, cost: { money: 2000, steel: 1000, fuel: 100 },
        income: { fuel: 50 },
        description: "Нефтяной завод. +50 топлива/тик." },
    ],
  },

  // ── СТАЛЕПЛАВИЛЬНЯ ────────────────────────────────────────
  steel_mill: {
    id: "steel_mill", label: "Сталеплавильня",
    icon: "⚙️", category: "economy", maxPerBase: 2,
    requires: ["command_bunker"],
    levels: [
      { hp: 600, buildTime: 60,  cost: { money: 400, steel: 50 },
        income: { steel: 12 },
        description: "Производит сталь. +12 стали/тик." },
      { hp: 900, buildTime: 150, cost: { money: 1000, steel: 200 },
        income: { steel: 28 },
        description: "Крупный завод. +28 стали/тик." },
      { hp: 1400, buildTime: 300, cost: { money: 2500, steel: 500, fuel: 200 },
        income: { steel: 60 },
        description: "Металлургический комбинат. +60 стали/тик." },
    ],
  },

  // ── УРАНОВЫЙ РЕАКТОР ──────────────────────────────────────
  uranium_reactor: {
    id: "uranium_reactor", label: "Урановый реактор",
    icon: "☢️", category: "economy", maxPerBase: 1,
    requires: ["steel_mill", "oil_rig"],
    levels: [
      { hp: 800, buildTime: 120, cost: { money: 1000, steel: 500, fuel: 100 },
        income: { uranium: 3 },
        description: "Обогащает уран. +3 урана/тик." },
      { hp: 1200, buildTime: 300, cost: { money: 2500, steel: 1000, fuel: 300 },
        income: { uranium: 7 },
        description: "Расширенный реактор. +7 урана/тик." },
      { hp: 2000, buildTime: 600, cost: { money: 5000, steel: 2000, uranium: 100, fuel: 500 },
        income: { uranium: 15 },
        description: "Ядерный комплекс. +15 урана/тик. Смертельно опасен." },
    ],
  },

  // ── СКЛАД ─────────────────────────────────────────────────
  warehouse: {
    id: "warehouse", label: "Склад",
    icon: "🏪", category: "economy", maxPerBase: 2,
    requires: ["command_bunker"],
    levels: [
      { hp: 400, buildTime: 30,  cost: { money: 200, steel: 300 },
        storageBonus: 2000,
        description: "+2000 к лимиту хранения всех ресурсов." },
      { hp: 700, buildTime: 90,  cost: { money: 600, steel: 700 },
        storageBonus: 5000,
        description: "+5000 к лимиту хранения." },
      { hp: 1000, buildTime: 200, cost: { money: 1500, steel: 1500 },
        storageBonus: 12000,
        description: "+12000 к лимиту хранения." },
    ],
  },

  // ── РАДАР ─────────────────────────────────────────────────
  radar: {
    id: "radar", label: "Радар",
    icon: "📡", category: "military", maxPerBase: 2,
    requires: ["command_bunker"],
    levels: [
      { hp: 300, buildTime: 45,  cost: { money: 300, steel: 150 },
        radarRadius: 80,
        description: "Открывает туман войны. Радиус 80 клеток." },
      { hp: 500, buildTime: 120, cost: { money: 800, steel: 400 },
        radarRadius: 160,
        description: "Дальний радар. Радиус 160 клеток." },
      { hp: 800, buildTime: 240, cost: { money: 2000, steel: 800, uranium: 20 },
        radarRadius: 300,
        description: "Стратегический радар. Радиус 300 клеток." },
    ],
  },

  // ── РАКЕТНАЯ ШАХТА ────────────────────────────────────────
  missile_silo: {
    id: "missile_silo", label: "Ракетная шахта",
    icon: "🚀", category: "military", maxPerBase: 2,
    requires: ["radar", "oil_rig"],
    levels: [
      { hp: 1000, buildTime: 120, cost: { money: 800, steel: 500, fuel: 100 },
        missileDamage: 200, missileRange: 200,
        description: "Обычные ракеты. Урон 200, дальность 200 кл." },
      { hp: 1500, buildTime: 300, cost: { money: 2000, steel: 1000, fuel: 300 },
        missileDamage: 450, missileRange: 400,
        description: "Баллистические ракеты. Урон 450, дальность 400 кл." },
      { hp: 2500, buildTime: 600, cost: { money: 5000, steel: 2000, uranium: 200, fuel: 500 },
        missileDamage: 1200, missileRange: 1000,
        description: "Ядерная шахта. Урон 1200 в радиусе 5 кл." },
    ],
  },

  // ── СИСТЕМА ПРО ───────────────────────────────────────────
  anti_missile: {
    id: "anti_missile", label: "Система ПРО",
    icon: "🛡️", category: "defense", maxPerBase: 3,
    requires: ["radar"],
    levels: [
      { hp: 700, buildTime: 90,  cost: { money: 600, steel: 400 },
        pvoChance: 0.25,
        description: "Перехватывает 25% входящих ракет." },
      { hp: 1100, buildTime: 200, cost: { money: 1500, steel: 800, fuel: 100 },
        pvoChance: 0.50,
        description: "Улучшенное ПРО. Перехват 50% ракет." },
      { hp: 1800, buildTime: 400, cost: { money: 3500, steel: 1500, uranium: 50, fuel: 200 },
        pvoChance: 0.80,
        description: "Эгида. Перехват 80% ракет." },
    ],
  },

  // ── СТЕНА ────────────────────────────────────────────────
  wall: {
    id: "wall", label: "Стена",
    icon: "🧱", category: "defense", maxPerBase: 20,
    requires: ["command_bunker"],
    levels: [
      { hp: 1000, buildTime: 10, cost: { money: 50,  steel: 200 },
        description: "Базовая стена. 1000 HP." },
      { hp: 2500, buildTime: 30, cost: { money: 150, steel: 500 },
        description: "Укреплённая стена. 2500 HP." },
      { hp: 6000, buildTime: 60, cost: { money: 400, steel: 1200 },
        description: "Фортификация. 6000 HP." },
    ],
  },
};

// ============================================================
// ХЕЛПЕРЫ
// ============================================================

// Получить конфиг уровня (уровень 1-3)
export function getBuildingLevel(type: string, level: number): BuildingLevel | null {
  const config = BUILDINGS[type];
  if (!config) return null;
  const idx = Math.max(0, Math.min(2, level - 1));
  return config.levels[idx];
}

// Стоимость апгрейда (следующий уровень)
export function getUpgradeCost(type: string, currentLevel: number): ResourceCost | null {
  if (currentLevel >= 3) return null;
  return getBuildingLevel(type, currentLevel + 1)?.cost ?? null;
}

// Проверить доступность здания (есть ли нужные постройки)
export function checkRequirements(
  type: string,
  existingTypes: string[]
): { ok: boolean; missing: string[] } {
  const config = BUILDINGS[type];
  if (!config?.requires) return { ok: true, missing: [] };
  const missing = config.requires.filter(r => !existingTypes.includes(r));
  return { ok: missing.length === 0, missing };
}