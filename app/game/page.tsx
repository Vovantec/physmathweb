"use client";

import { useEffect, useState, useCallback } from "react";
import * as Colyseus from "colyseus.js";
import dynamic from "next/dynamic";

// Three.js грузим динамически (SSR отключён)
const ThreeScene = dynamic(() => import("./ThreeScene"), { ssr: false });

// ============================================================
// ТИПЫ
// ============================================================
interface Building {
  id: string; type: string;
  x: number; y: number;
  hp: number; maxHp: number;
  isBuilding: boolean;
}

interface MissileData {
  id: string;
  startX: number; startY: number;
  targetX: number; targetY: number;
  launchTime: number; impactTime: number;
}

interface Resources {
  money: number; steel: number;
  uranium: number; energy: number;
}

interface GameManagerProps {
  userId: string;
  gameToken: string;
}

// ============================================================
// ЗДАНИЯ — конфиг для UI
// ============================================================
const BUILDING_MENU = [
  { type: "barracks",     label: "Казармы",     icon: "🏠", cost: { money: 200, steel: 100 } },
  { type: "radar",        label: "Радар",        icon: "📡", cost: { money: 300, steel: 150 } },
  { type: "missile_silo", label: "Шахта",        icon: "🚀", cost: { money: 500, steel: 300, uranium: 50 } },
  { type: "anti_missile", label: "ПВО",          icon: "🛡️", cost: { money: 400, steel: 200 } },
  { type: "wall",         label: "Стена",        icon: "🧱", cost: { money: 50,  steel: 200 } },
];

// ============================================================
// КОМПОНЕНТ
// ============================================================
export default function GameManager({ userId, gameToken }: GameManagerProps) {
  const [status,     setStatus]     = useState("Подключение...");
  const [buildings,  setBuildings]  = useState<Building[]>([]);
  const [missiles,   setMissiles]   = useState<MissileData[]>([]);
  const [resources,  setResources]  = useState<Resources>({ money: 0, steel: 0, uranium: 0, energy: 0 });
  const [room,       setRoom]       = useState<Colyseus.Room | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [notifications,    setNotifications]    = useState<string[]>([]);

  // Добавить уведомление
  const notify = useCallback((msg: string) => {
    setNotifications(prev => [msg, ...prev].slice(0, 5));
    setTimeout(() => setNotifications(prev => prev.slice(0, -1)), 4000);
  }, []);

  // === ПОДКЛЮЧЕНИЕ К COLYSEUS ===
  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL || "ws://localhost:2567";
    const client = new Colyseus.Client(serverUrl);
    let currentRoom: Colyseus.Room;

    const connect = async () => {
      try {
        setStatus("Авторизация...");
        currentRoom = await client.joinOrCreate("base_room", {
          token: gameToken,
          userId,
        });
        setRoom(currentRoom);
        setStatus("Соединение установлено ✅");

        // === СЛУШАЕМ СТЕЙТ ===

        // Ресурсы
        currentRoom.state.resources.onChange(() => {
          setResources({
            money:   currentRoom.state.resources.money,
            steel:   currentRoom.state.resources.steel,
            uranium: currentRoom.state.resources.uranium,
            energy:  currentRoom.state.resources.energy,
          });
        });

        // Здания
        currentRoom.state.buildings.onAdd((building: any, key: string) => {
          setBuildings(prev => [...prev.filter(b => b.id !== key), {
            id: key, type: building.type,
            x: building.x, y: building.y,
            hp: building.hp, maxHp: building.maxHp,
            isBuilding: building.isBuilding,
          }]);
        });
        currentRoom.state.buildings.onRemove((_: any, key: string) => {
          setBuildings(prev => prev.filter(b => b.id !== key));
        });
        currentRoom.state.buildings.onChange((building: any, key: string) => {
          setBuildings(prev => prev.map(b =>
            b.id === key ? { ...b,
              hp: building.hp, isBuilding: building.isBuilding,
            } : b
          ));
        });

        // Ракеты
        currentRoom.state.missiles.onAdd((missile: any, key: string) => {
          setMissiles(prev => [...prev, {
            id: key,
            startX: missile.startX, startY: missile.startY,
            targetX: missile.targetX, targetY: missile.targetY,
            launchTime: missile.launchTime, impactTime: missile.impactTime,
          }]);
        });
        currentRoom.state.missiles.onRemove((_: any, key: string) => {
          setMissiles(prev => prev.filter(m => m.id !== key));
        });

        // === СООБЩЕНИЯ ОТ СЕРВЕРА ===
        currentRoom.onMessage("WELCOME",          (d) => notify(d.message));
        currentRoom.onMessage("ERROR",            (d) => notify(`❌ ${d.message}`));
        currentRoom.onMessage("BUILDING_PLACED",  (d) => notify(`🏗️ Строится... (${d.buildTime}с)`));
        currentRoom.onMessage("BUILDING_READY",   (d) => notify(`✅ ${d.type} готово!`));
        currentRoom.onMessage("MISSILE_LAUNCHED", ()  => notify("🚀 Ракета запущена!"));

        currentRoom.onLeave(() => setStatus("Соединение потеряно"));
        currentRoom.onError((code, msg) => setStatus(`Ошибка: ${msg}`));

      } catch (e: any) {
        setStatus(`Ошибка подключения: ${e.message}`);
      }
    };

    connect();
    return () => { if (currentRoom) currentRoom.leave(); };
  }, [gameToken, userId, notify]);

  // === КЛИК ПО СЕТКЕ ===
  const handleCellClick = useCallback((x: number, y: number) => {
    if (!room || !selectedBuilding) return;
    room.send("PLACE_BUILDING", { type: selectedBuilding, x, y });
  }, [room, selectedBuilding]);

  return (
    <div className="relative w-full h-screen bg-[#0a0f1e] overflow-hidden">

      {/* === THREE.JS СЦЕНА === */}
      <div className="absolute inset-0">
        <ThreeScene
          buildings={buildings}
          missiles={missiles}
          onCellClick={handleCellClick}
        />
      </div>

      {/* === ВЕРХНЯЯ ПАНЕЛЬ — РЕСУРСЫ === */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2
                      bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex gap-4">
          <ResourceBadge icon="💰" value={resources.money}   label="Деньги" />
          <ResourceBadge icon="⚙️" value={resources.steel}   label="Сталь" />
          <ResourceBadge icon="☢️" value={resources.uranium} label="Уран" />
          <ResourceBadge icon="⚡" value={resources.energy}  label="Энергия" />
        </div>
        <div className="text-xs font-mono text-green-400 bg-black/50 px-3 py-1 rounded border border-green-400/30">
          {status}
        </div>
      </div>

      {/* === ЛЕВАЯ ПАНЕЛЬ — ЗДАНИЯ === */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
        <div className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-1 text-center">
          Постройки
        </div>
        {BUILDING_MENU.map(b => (
          <button
            key={b.type}
            onClick={() => setSelectedBuilding(prev => prev === b.type ? null : b.type)}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-lg border transition-all
              text-xs font-mono w-20
              ${selectedBuilding === b.type
                ? "bg-yellow-400/20 border-yellow-400 text-yellow-400"
                : "bg-black/60 border-white/10 text-gray-300 hover:border-white/30"
              }
            `}
          >
            <span className="text-2xl">{b.icon}</span>
            <span className="text-[10px] text-center leading-tight">{b.label}</span>
            <span className="text-[9px] text-gray-500">
              💰{b.cost.money}
            </span>
          </button>
        ))}
      </div>

      {/* === ПОДСКАЗКА ПРИ ВЫБОРЕ ЗДАНИЯ === */}
      {selectedBuilding && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10
                        bg-black/80 border border-yellow-400/50 rounded-lg px-4 py-2
                        text-xs font-mono text-yellow-400 animate-pulse">
          Нажмите на клетку для постройки
        </div>
      )}

      {/* === УВЕДОМЛЕНИЯ === */}
      <div className="absolute top-16 right-4 z-10 flex flex-col gap-2 items-end">
        {notifications.map((n, i) => (
          <div key={i} className="bg-black/80 border border-white/10 rounded px-3 py-1.5
                                   text-xs font-mono text-white animate-in slide-in-from-right">
            {n}
          </div>
        ))}
      </div>

      {/* === НИЖНЯЯ ПАНЕЛЬ — ДЕЙСТВИЯ === */}
      <div className="absolute bottom-0 left-0 right-0 z-10
                      bg-gradient-to-t from-black/80 to-transparent
                      flex items-center justify-center gap-4 py-4">
        <button
          onClick={() => room?.send("SAVE_BASE", {})}
          className="bg-white/10 hover:bg-white/20 border border-white/20 rounded px-4 py-2
                     text-xs font-mono text-white uppercase tracking-widest transition"
        >
          💾 Сохранить
        </button>
        <button
          onClick={() => setSelectedBuilding(null)}
          className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded px-4 py-2
                     text-xs font-mono text-red-400 uppercase tracking-widest transition"
        >
          ❌ Отмена
        </button>
      </div>
    </div>
  );
}

// ============================================================
// КОМПОНЕНТ РЕСУРСА
// ============================================================
function ResourceBadge({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-black/50 border border-white/10 rounded px-3 py-1.5">
      <span className="text-base">{icon}</span>
      <div className="flex flex-col">
        <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest leading-none">{label}</span>
        <span className="text-sm font-bold font-mono text-white">{value.toLocaleString()}</span>
      </div>
    </div>
  );
}