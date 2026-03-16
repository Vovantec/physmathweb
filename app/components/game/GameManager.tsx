"use client";

import { useEffect, useState, useCallback } from "react";
import * as Colyseus from "colyseus.js";
import dynamic from "next/dynamic";
import { BUILDINGS } from "./building-config";

const ThreeScene = dynamic(() => import("@/app/components/game/ThreeScene"), { ssr: false });

// ── ТИПЫ ─────────────────────────────────────────────────
interface Building {
  id: string; type: string;
  x: number; y: number;
  hp: number; maxHp: number;
  level: number;
  isBuilding: boolean; isUpgrading: boolean;
}
interface MissileData {
  id: string; missileType: string;
  startX: number; startY: number;
  targetX: number; targetY: number;
  launchTime: number; impactTime: number;
}
interface Resources {
  money: number; steel: number; fuel: number; uranium: number;
  maxMoney: number; maxSteel: number; maxFuel: number; maxUranium: number;
}

// ── ТИПЫ РАКЕТ ────────────────────────────────────────────
const MISSILE_TYPES = [
  { id: "standard", label: "Обычная",    icon: "🚀", fuel: 20,  uranium: 0 },
  { id: "cluster",  label: "Кассетная",  icon: "💥", fuel: 50,  uranium: 0 },
  { id: "nuclear",  label: "Ядерная",    icon: "☢️", fuel: 100, uranium: 50 },
  { id: "emp",      label: "ЭМИ",        icon: "⚡", fuel: 30,  uranium: 20 },
];

export default function GameManager({ userId, gameToken }: { userId: string; gameToken: string }) {
  const [buildings,  setBuildings]  = useState<Building[]>([]);
  const [missiles,   setMissiles]   = useState<MissileData[]>([]);
  const [resources,  setResources]  = useState<Resources>({ money:0, steel:0, fuel:0, uranium:0, maxMoney:5000, maxSteel:3000, maxFuel:2000, maxUranium:500 });
  const [room,       setRoom]       = useState<Colyseus.Room | null>(null);
  const [status,     setStatus]     = useState("Подключение...");

  // UI состояния
  const [tab,              setTab]              = useState<"build"|"upgrade"|"attack">("build");
  const [selectedType,     setSelectedType]     = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedMissile,  setSelectedMissile]  = useState("standard");
  const [notifications,    setNotifications]    = useState<{msg: string; type: "ok"|"err"|"info"}[]>([]);

  const notify = useCallback((msg: string, type: "ok"|"err"|"info" = "info") => {
    setNotifications(prev => [{ msg, type }, ...prev].slice(0, 6));
    setTimeout(() => setNotifications(prev => prev.slice(0, -1)), 4000);
  }, []);

  // ПОДКЛЮЧЕНИЕ
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_GAME_SERVER_URL || "ws://localhost:2567";
    const client = new Colyseus.Client(url);
    let r: Colyseus.Room;

    (async () => {
      try {
        setStatus("Авторизация...");
        r = await client.joinOrCreate("base_room", { token: gameToken, userId });
        setRoom(r);
        setStatus("✅ Онлайн");

        // Ресурсы
        r.state.resources.onChange(() => {
          setResources({
            money:      r.state.resources.money,
            steel:      r.state.resources.steel,
            fuel:       r.state.resources.fuel,
            uranium:    r.state.resources.uranium,
            maxMoney:   r.state.resources.maxMoney,
            maxSteel:   r.state.resources.maxSteel,
            maxFuel:    r.state.resources.maxFuel,
            maxUranium: r.state.resources.maxUranium,
          });
        });

        // Здания
        r.state.buildings.onAdd((b: any, key: string) => {
          setBuildings(prev => [...prev.filter(x => x.id !== key), {
            id: key, type: b.type, x: b.x, y: b.y,
            hp: b.hp, maxHp: b.maxHp, level: b.level,
            isBuilding: b.isBuilding, isUpgrading: b.isUpgrading,
          }]);
        });
        r.state.buildings.onRemove((_: any, key: string) => {
          setBuildings(prev => prev.filter(b => b.id !== key));
          setSelectedBuilding(prev => prev?.id === key ? null : prev);
        });
        r.state.buildings.onChange((b: any, key: string) => {
          setBuildings(prev => prev.map(x => x.id !== key ? x : {
            ...x, hp: b.hp, level: b.level,
            isBuilding: b.isBuilding, isUpgrading: b.isUpgrading,
          }));
        });

        // Ракеты
        r.state.missiles.onAdd((m: any, key: string) => {
          setMissiles(prev => [...prev, {
            id: key, missileType: m.missileType,
            startX: m.startX, startY: m.startY,
            targetX: m.targetX, targetY: m.targetY,
            launchTime: m.launchTime, impactTime: m.impactTime,
          }]);
        });
        r.state.missiles.onRemove((_: any, key: string) => {
          setMissiles(prev => prev.filter(m => m.id !== key));
        });

        // Сообщения
        r.onMessage("WELCOME",          (d: any) => notify(d.message, "ok"));
        r.onMessage("ERROR",            (d: any) => notify(d.message, "err"));
        r.onMessage("BUILDING_PLACED",  (d: any) => notify(`🏗️ ${d.label} строится (${d.buildTime}с)`, "info"));
        r.onMessage("BUILDING_READY",   (d: any) => notify(`✅ ${d.label} готово!`, "ok"));
        r.onMessage("UPGRADE_STARTED",  (d: any) => notify(`⬆️ Апгрейд до ур.${d.newLevel} (${d.upgradeTime}с)`, "info"));
        r.onMessage("UPGRADE_COMPLETE", (d: any) => notify(`✅ ${d.label} улучшен до ур.${d.newLevel}!`, "ok"));
        r.onMessage("MISSILE_LAUNCHED", () => notify("🚀 Ракета запущена!", "ok"));
        r.onMessage("BUILDING_DEMOLISHED", () => notify("💣 Здание снесено", "info"));

        r.onLeave(() => setStatus("Соединение потеряно"));
      } catch (e: any) {
        setStatus(`❌ ${e.message}`);
      }
    })();

    return () => { if (r) r.leave(); };
  }, [gameToken, userId]);

  // КЛИК ПО СЕТКЕ — ПОСТРОЙКА
  const handleCellClick = useCallback((x: number, y: number) => {
    if (!room || !selectedType) return;
    room.send("PLACE_BUILDING", { type: selectedType, x, y });
    setSelectedType(null);
  }, [room, selectedType]);

  // КЛИК ПО ЗДАНИЮ
  const handleBuildingClick = useCallback((id: string) => {
    const b = buildings.find(b => b.id === id);
    if (b) { setSelectedBuilding(b); setTab("upgrade"); }
  }, [buildings]);

  // АПГРЕЙД
  const handleUpgrade = () => {
    if (!room || !selectedBuilding) return;
    room.send("UPGRADE_BUILDING", { id: selectedBuilding.id });
  };

  // СНОС
  const handleDemolish = () => {
    if (!room || !selectedBuilding) return;
    if (!confirm(`Снести ${BUILDINGS[selectedBuilding.type]?.label}? Вернётся 50% ресурсов.`)) return;
    room.send("DEMOLISH_BUILDING", { id: selectedBuilding.id });
    setSelectedBuilding(null);
  };

  // Получить здания для атаки (ракетные шахты готовые)
  const readySilos = buildings.filter(b => b.type === "missile_silo" && !b.isBuilding && !b.isUpgrading);

  const currentBldConfig = selectedBuilding ? BUILDINGS[selectedBuilding.type] : null;
  const currentBldLevel  = selectedBuilding ? currentBldConfig?.levels[selectedBuilding.level - 1] : null;

  return (
    <div className="relative w-full h-screen bg-[#0a0f1e] overflow-hidden font-mono">

      {/* THREE.JS СЦЕНА */}
      <div className="absolute inset-0">
        <ThreeScene
          buildings={buildings}
          missiles={missiles}
          selectedBuildingId={selectedBuilding?.id}
          onCellClick={handleCellClick}
          onBuildingClick={handleBuildingClick}
        />
      </div>

      {/* ВЕРХНЯЯ ПАНЕЛЬ — РЕСУРСЫ */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between
                      px-4 py-2 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex gap-2 flex-wrap">
          <ResourceBar icon="💰" val={resources.money}   max={resources.maxMoney}   label="Деньги" color="yellow" />
          <ResourceBar icon="⚙️" val={resources.steel}   max={resources.maxSteel}   label="Сталь"  color="blue"   />
          <ResourceBar icon="🛢️" val={resources.fuel}    max={resources.maxFuel}    label="Топливо" color="orange"/>
          <ResourceBar icon="☢️" val={resources.uranium} max={resources.maxUranium} label="Уран"   color="green"  />
        </div>
        <span className="text-[10px] text-green-400 bg-black/60 px-2 py-1 rounded border border-green-400/20">
          {status}
        </span>
      </div>

      {/* ЛЕВАЯ ПАНЕЛЬ — ВКЛАДКИ */}
      <div className="absolute left-3 top-16 bottom-16 z-20 w-52 flex flex-col gap-2">

        {/* Табы */}
        <div className="flex gap-1 bg-black/70 rounded p-1 border border-white/10">
          {(["build","upgrade","attack"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 text-[10px] py-1.5 rounded uppercase tracking-widest transition
                ${tab === t ? "bg-yellow-400 text-black font-bold" : "text-gray-400 hover:text-white"}`}>
              {t === "build" ? "🏗️" : t === "upgrade" ? "⬆️" : "🚀"}
            </button>
          ))}
        </div>

        {/* ВКЛАДКА: ПОСТРОЙКА */}
        {tab === "build" && (
          <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 pr-1">
            {Object.values(BUILDINGS).map(cfg => {
              const lvl1 = cfg.levels[0];
              const canAfford = resources.money >= (lvl1.cost.money||0) && resources.steel >= (lvl1.cost.steel||0);
              const isSelected = selectedType === cfg.id;
              return (
                <button key={cfg.id}
                  onClick={() => setSelectedType(isSelected ? null : cfg.id)}
                  className={`text-left p-2 rounded border text-xs transition
                    ${isSelected ? "bg-yellow-400/20 border-yellow-400 text-yellow-300"
                      : canAfford ? "bg-black/60 border-white/10 text-gray-300 hover:border-white/30"
                      : "bg-black/40 border-white/5 text-gray-600 cursor-not-allowed"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span>{cfg.icon}</span>
                    <span className="font-bold truncate">{cfg.label}</span>
                    <span className={`ml-auto text-[9px] px-1 rounded ${
                      cfg.category === "economy" ? "bg-green-900 text-green-400"
                      : cfg.category === "military" ? "bg-red-900 text-red-400"
                      : cfg.category === "defense" ? "bg-blue-900 text-blue-400"
                      : "bg-purple-900 text-purple-400"}`}>
                      {cfg.category}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 mb-1">{lvl1.description}</div>
                  <div className="flex gap-2 text-[10px]">
                    {lvl1.cost.money  ? <span className="text-yellow-400">💰{lvl1.cost.money}</span>  : null}
                    {lvl1.cost.steel  ? <span className="text-blue-400">⚙️{lvl1.cost.steel}</span>    : null}
                    {lvl1.cost.fuel   ? <span className="text-orange-400">🛢️{lvl1.cost.fuel}</span>   : null}
                    {lvl1.cost.uranium? <span className="text-green-400">☢️{lvl1.cost.uranium}</span> : null}
                  </div>
                  {cfg.maxPerBase <= 1 && <div className="text-[9px] text-purple-400 mt-0.5">Макс: {cfg.maxPerBase}</div>}
                </button>
              );
            })}
          </div>
        )}

        {/* ВКЛАДКА: АПГРЕЙД */}
        {tab === "upgrade" && (
          <div className="flex flex-col gap-2 flex-1">
            {!selectedBuilding ? (
              <div className="text-center text-gray-500 text-xs py-8 border border-dashed border-white/10 rounded">
                Нажмите на здание<br/>в игре
              </div>
            ) : (
              <div className="bg-black/70 border border-white/10 rounded p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{currentBldConfig?.icon}</span>
                  <div>
                    <div className="font-bold text-white text-sm">{currentBldConfig?.label}</div>
                    <div className="text-[10px] text-yellow-400">Уровень {selectedBuilding.level}/3</div>
                  </div>
                </div>

                {/* HP бар */}
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>HP</span>
                    <span>{selectedBuilding.hp}/{selectedBuilding.maxHp}</span>
                  </div>
                  <div className="h-1.5 bg-black/50 rounded overflow-hidden">
                    <div className="h-full bg-green-500 transition-all"
                      style={{ width: `${(selectedBuilding.hp/selectedBuilding.maxHp)*100}%` }} />
                  </div>
                </div>

                {/* Текущий уровень */}
                {currentBldLevel && (
                  <div className="text-[10px] text-gray-400 border-t border-white/5 pt-2">
                    {currentBldLevel.description}
                    {currentBldLevel.income && (
                      <div className="mt-1 text-green-400">
                        Доход: {Object.entries(currentBldLevel.income).map(([k,v]) =>
                          `+${v} ${k}`
                        ).join(", ")}
                      </div>
                    )}
                  </div>
                )}

                {/* Кнопка апгрейда */}
                {selectedBuilding.level < 3 && !selectedBuilding.isBuilding && !selectedBuilding.isUpgrading && (() => {
                  const nextLvl = currentBldConfig?.levels[selectedBuilding.level];
                  const cost = nextLvl?.cost;
                  const canUp = cost
                    ? resources.money >= (cost.money||0) && resources.steel >= (cost.steel||0)
                      && resources.fuel >= (cost.fuel||0) && resources.uranium >= (cost.uranium||0)
                    : false;
                  return (
                    <button onClick={handleUpgrade} disabled={!canUp}
                      className={`w-full py-2 rounded text-xs font-bold uppercase tracking-widest transition
                        ${canUp ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-black/40 text-gray-600 cursor-not-allowed"}`}>
                      ⬆️ Ур.{selectedBuilding.level + 1}
                      {cost && <span className="block text-[10px] font-normal normal-case tracking-normal mt-0.5">
                        {cost.money ? `💰${cost.money} ` : ""}{cost.steel ? `⚙️${cost.steel}` : ""}
                      </span>}
                    </button>
                  );
                })()}

                {(selectedBuilding.isBuilding || selectedBuilding.isUpgrading) && (
                  <div className="text-center text-yellow-400 text-xs animate-pulse py-2">
                    {selectedBuilding.isBuilding ? "🏗️ Строится..." : "⬆️ Улучшается..."}
                  </div>
                )}

                {selectedBuilding.type !== "command_bunker" && (
                  <button onClick={handleDemolish}
                    className="w-full py-1.5 rounded text-[10px] border border-red-500/30 text-red-400
                               hover:bg-red-500/20 transition uppercase tracking-widest mt-1">
                    💣 Снести (возврат 50%)
                  </button>
                )}

                <button onClick={() => setSelectedBuilding(null)}
                  className="text-[10px] text-gray-600 hover:text-gray-400 transition text-center">
                  отменить выбор
                </button>
              </div>
            )}
          </div>
        )}

        {/* ВКЛАДКА: АТАКА */}
        {tab === "attack" && (
          <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
            {readySilos.length === 0 ? (
              <div className="text-center text-gray-500 text-xs py-8 border border-dashed border-white/10 rounded">
                Нет готовых шахт.<br/>Постройте Ракетную шахту.
              </div>
            ) : (
              <>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest">Тип ракеты:</div>
                {MISSILE_TYPES.map(mt => (
                  <button key={mt.id} onClick={() => setSelectedMissile(mt.id)}
                    className={`text-left p-2 rounded border text-xs transition
                      ${selectedMissile === mt.id
                        ? "bg-red-500/20 border-red-500 text-red-300"
                        : "bg-black/60 border-white/10 text-gray-400 hover:border-white/30"}`}>
                    <div className="flex items-center gap-1.5">
                      <span>{mt.icon}</span><span className="font-bold">{mt.label}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      🛢️{mt.fuel}{mt.uranium > 0 ? ` ☢️${mt.uranium}` : ""}
                    </div>
                  </button>
                ))}

                <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">
                  Шахты ({readySilos.length}):
                </div>
                {readySilos.map(s => (
                  <div key={s.id} className="bg-black/60 border border-white/10 rounded p-2 text-xs">
                    <div className="text-gray-300">🚀 Шахта ур.{s.level}</div>
                    <div className="text-[10px] text-gray-500">[{s.x},{s.y}]</div>
                  </div>
                ))}

                <div className="text-[10px] text-yellow-400 border border-yellow-400/20 bg-yellow-400/5 rounded p-2 mt-1">
                  Выберите цель на глобальной карте (скоро)
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ПОДСКАЗКА */}
      {selectedType && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20
                        bg-black/90 border border-yellow-400/50 rounded px-4 py-2
                        text-xs text-yellow-400 animate-pulse pointer-events-none">
          {BUILDINGS[selectedType]?.icon} Кликните на клетку для постройки · ESC — отмена
        </div>
      )}

      {/* УВЕДОМЛЕНИЯ */}
      <div className="absolute top-16 right-3 z-20 flex flex-col gap-1.5 items-end pointer-events-none">
        {notifications.map((n, i) => (
          <div key={i} className={`text-xs px-3 py-1.5 rounded border backdrop-blur-sm
            ${n.type === "ok"  ? "bg-green-900/80 border-green-500/30 text-green-300"
            : n.type === "err" ? "bg-red-900/80 border-red-500/30 text-red-300"
            :                    "bg-black/80 border-white/10 text-gray-300"}`}>
            {n.msg}
          </div>
        ))}
      </div>

      {/* НИЖНЯЯ ПАНЕЛЬ */}
      <div className="absolute bottom-0 left-0 right-0 z-20
                      bg-gradient-to-t from-black/90 to-transparent
                      flex items-center justify-center gap-3 py-3">
        <button onClick={() => room?.send("SAVE_BASE", {})}
          className="bg-white/10 hover:bg-white/20 border border-white/20 rounded px-4 py-2
                     text-xs text-white uppercase tracking-widest transition">
          💾 Сохранить
        </button>
        {selectedType && (
          <button onClick={() => setSelectedType(null)}
            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded px-4 py-2
                       text-xs text-red-400 uppercase tracking-widest transition">
            ✕ Отмена
          </button>
        )}
      </div>

    </div>
  );
}

// ── РЕСУРС БАР ────────────────────────────────────────────
function ResourceBar({ icon, val, max, label, color }: {
  icon: string; val: number; max: number; label: string; color: string;
}) {
  const pct = Math.min((val/max)*100, 100);
  const barColor = { yellow: "bg-yellow-400", blue: "bg-blue-400", orange: "bg-orange-400", green: "bg-green-400" }[color] || "bg-white";
  return (
    <div className="flex flex-col bg-black/60 border border-white/10 rounded px-2.5 py-1.5 min-w-[80px]">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-sm font-bold text-white">{val.toLocaleString()}</span>
      <div className="h-1 bg-black/50 rounded overflow-hidden mt-1">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-gray-600 mt-0.5">/{max.toLocaleString()}</span>
    </div>
  );
}