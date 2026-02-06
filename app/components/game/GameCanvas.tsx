'use client';
import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/lib/game/GameEngine';
import { Room } from 'colyseus.js';
import DialogModal from './DialogModal';
// import { DialogData } from '@/lib/game/types'; // Раскомментируйте, если есть типы

// Временный интерфейс, если нет в types.ts
interface DialogData {
  npcName: string;
  text: string;
  options: { id: number; text: string }[];
}

interface GameCanvasProps {
  room: Room;
}

export default function GameCanvas({ room }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Храним ID NPC, к которому мы идем, в ref (чтобы не вызывать перерисовки)
  const pendingInteraction = useRef<string | null>(null);

  const [dialogData, setDialogData] = useState<DialogData | null>(null);

  useEffect(() => {
    if (engineRef.current) return;

    const engine = new GameEngine();
    engineRef.current = engine;
    let isMounted = true;

    const launch = async () => {
        if (!canvasRef.current) return;
        const success = await engine.init(canvasRef.current);
        if (!isMounted || !success) return;

        engine.attachRoom(room);

        // --- 1. КЛИК ПО NPC ---
        engine.onNpcInteract = (id, x, y) => {
            console.log("React: Clicked NPC, walking to...", id);
            
            // Запоминаем, что мы хотим поговорить с этим NPC по прибытии
            pendingInteraction.current = id;

            // Логика движения к цели
            const myPlayer = engine.players.get(room.sessionId);
            if (myPlayer) {
                const startX = engine.pathfindingManager.toGrid(myPlayer.x);
                const startY = engine.pathfindingManager.toGrid(myPlayer.y);
                const endX = engine.pathfindingManager.toGrid(x);
                const endY = engine.pathfindingManager.toGrid(y);

                const path = engine.pathfindingManager.findPath(startX, startY, endX, endY);
                
                if (path.length > 0) {
                    // Убираем последнюю точку (самого NPC), чтобы встать рядом
                    if (path.length > 1) path.pop(); 
                    
                    engine.movePlayerAlongPath(room.sessionId, path);
                    room.send("movePath", { path: path }); 
                } else {
                    // Если мы уже стоим вплотную - path пустой или короткий.
                    // Можно сразу открывать диалог.
                    // Для простоты вызовем "прибытие" вручную или позволим engine.onPlayerArrived сработать (если логика позволяет)
                    // Но проще просто сразу открыть:
                    handleOpenDialog(id);
                    pendingInteraction.current = null;
                }
            }
        };

        // --- 2. ИГРОК ПРИШЕЛ ---
        engine.onPlayerArrived = () => {
            if (pendingInteraction.current) {
                console.log("React: Arrived at target, opening dialog:", pendingInteraction.current);
                handleOpenDialog(pendingInteraction.current);
                pendingInteraction.current = null; // Сбрасываем цель
            }
        };

        // --- 3. КЛИК ПО ЗЕМЛЕ ---
        if (engine.viewport) {
            engine.viewport.on('clicked', (e) => {
                // Если кликнули в пустоту - отменяем намерение говорить
                pendingInteraction.current = null;
                setDialogData(null); // Закрываем текущее окно

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

    // Вынесенная функция открытия диалога
    const handleOpenDialog = (npcId: string) => {
         setDialogData({
            npcName: `Страж ${npcId.slice(0, 4)}`,
            text: `Привет! Я видел, как ты шел ко мне через весь экран. Я NPC с ID: ${npcId}`,
            options: [
                { id: 1, text: "Взять квест" },
                { id: 2, text: "Торговать" },
                { id: 3, text: "Уйти" }
            ]
        });
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
    <div className="relative w-full h-full">
        <canvas ref={canvasRef} className="block w-full h-full bg-slate-900" />
        
        {dialogData && (
            <DialogModal 
                data={dialogData}
                onOptionSelect={(id) => {
                    if (id === 3) setDialogData(null);
                    // Тут можно добавить логику других кнопок
                }}
                onClose={() => setDialogData(null)}
            />
        )}
    </div>
  );
}