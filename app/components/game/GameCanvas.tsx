'use client';
import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/lib/game/GameEngine';
import { Room } from 'colyseus.js';
import DialogModal from './DialogModal';
// Импортируем тип из ваших типов. Если его нет, раскомментируйте интерфейс ниже.
import { DialogData } from '@/lib/game/types'; 

/* // Если TypeScript ругается на DialogData, раскомментируйте этот блок:
interface DialogData {
  npcName: string;
  text: string;
  options: { id: number; text: string }[];
}
*/

interface GameCanvasProps {
  room: Room;
}

export default function GameCanvas({ room }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // 1. Добавляем состояние для диалога
  const [dialogData, setDialogData] = useState<DialogData | null>(null);

  useEffect(() => {
    // Защита от двойной инициализации (React 18)
    if (engineRef.current) return;

    const engine = new GameEngine();
    engineRef.current = engine;
    let isMounted = true;

    const launch = async () => {
        if (!canvasRef.current) return;
        const success = await engine.init(canvasRef.current);
        if (!isMounted || !success) return;

        engine.attachRoom(room);

        // --- 2. ОБРАБОТЧИК ВЗАИМОДЕЙСТВИЯ С NPC ---
        engine.onNpcInteract = (id, x, y) => {
            console.log("React: Opening dialog for", id);
            
            // А. Логика подхода к NPC (чтобы персонаж подошел перед разговором)
            const myPlayer = engine.players.get(room.sessionId);
            if (myPlayer) {
                const startX = engine.pathfindingManager.toGrid(myPlayer.x);
                const startY = engine.pathfindingManager.toGrid(myPlayer.y);
                const endX = engine.pathfindingManager.toGrid(x);
                const endY = engine.pathfindingManager.toGrid(y);

                // Ищем путь
                const path = engine.pathfindingManager.findPath(startX, startY, endX, endY);
                
                if (path.length > 0) {
                   // Убираем последнюю точку, чтобы встать РЯДОМ с NPC, а не НА него
                   // (можно убрать path.pop(), если хотите вставать прямо в ту же клетку)
                   if (path.length > 1) path.pop();

                   engine.movePlayerAlongPath(room.sessionId, path);
                   room.send("movePath", { path: path }); 
                }
            }

            // Б. Открытие диалогового окна
            // В будущем здесь будет запрос к серверу за текстом диалога
            setDialogData({
                npcName: `Страж ${id.slice(0, 4)}`, // Генерируем имя или берем из реестра
                text: "Приветствую, путник! Я охраняю эти земли. Не проходи мимо, если ищешь приключений.",
                options: [
                    { id: 1, text: "Торговать" },
                    { id: 2, text: "Взять задание" },
                    { id: 3, text: "Уйти" }
                ]
            });
        };

        // --- 3. ОБРАБОТЧИК КЛИКА ПО ЗЕМЛЕ ---
        if (engine.viewport) {
            engine.viewport.on('clicked', (e) => {
                // Если кликнули по земле — закрываем диалог
                setDialogData(null);

                const world = e.world;
                const myPlayer = engine.players.get(room.sessionId);
                if (!myPlayer) return;

                const startX = engine.pathfindingManager.toGrid(myPlayer.x);
                const startY = engine.pathfindingManager.toGrid(myPlayer.y);
                const endX = engine.pathfindingManager.toGrid(world.x);
                const endY = engine.pathfindingManager.toGrid(world.y);

                const path = engine.pathfindingManager.findPath(startX, startY, endX, endY);

                if (path.length > 0) {
                    engine.movePlayerAlongPath(room.sessionId, path);
                    room.send("movePath", { path: path }); 
                }
            });
        }
    };

    launch();

    return () => {
      isMounted = false;
      if (engineRef.current) {
          engineRef.current.destroy();
          engineRef.current = null;
      }
    };
  }, [room]);

  return (
    // Важно: relative, чтобы абсолютное окно диалога позиционировалось внутри этого блока
    <div className="relative w-full h-full">
        
        {/* Слой игры */}
        <canvas ref={canvasRef} className="block w-full h-full bg-slate-900" />
        
        {/* Слой UI: Диалоговое окно */}
        {dialogData && (
            <DialogModal 
                data={dialogData}
                onOptionSelect={(id) => {
                    console.log("Выбран вариант:", id);
                    // Здесь будет логика ответов. Пока просто закрываем на кнопке "Уйти" (id 3)
                    if (id === 3) setDialogData(null);
                }}
                onClose={() => setDialogData(null)}
            />
        )}

    </div>
  );
}