'use client';
import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/lib/game/GameEngine';
import { Room } from 'colyseus.js';
import DialogModal from './DialogModal';
import InventoryModal from './InventoryModal';
import { Item, DialogData } from '@/lib/game/types';

interface GameCanvasProps {
  room: Room;
}

export default function GameCanvas({ room }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // --- UI STATE ---
  const [dialogData, setDialogData] = useState<DialogData | null>(null);
  const pendingInteraction = useRef<string | null>(null);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);

  const isRoomConnected = () => {
      return room && room.connection && room.connection.isOpen;
  };

  useEffect(() => {
    // Чистим старые слушатели, чтобы не дублировались
    room.removeAllListeners();

    // 1. Подписываемся на события UI
    room.onMessage("dialog", (data: DialogData) => {
        setDialogData(data);
    });

    room.onMessage("inventory", (items: Item[]) => {
        setInventoryItems(items);
    });

    room.send("requestInventory");

    if (engineRef.current) return;

    const engine = new GameEngine();
    engineRef.current = engine;
    let isMounted = true;

    const launch = async () => {
        if (!canvasRef.current) return;
        
        // Init теперь фильтрует битые ассеты и не крашится
        const success = await engine.init(canvasRef.current);
        
        if (!isMounted || !success) {
            console.log("GameCanvas: Init aborted or failed");
            return;
        }

        // Подключаем комнату только после успешного init
        engine.attachRoom(room);

        // ==========================================
        // ЛОГИКА ДИАЛОГОВ И ДВИЖЕНИЯ
        // ==========================================
        
        engine.onNpcInteract = (id, x, y) => {
            pendingInteraction.current = id;
            const myPlayer = engine.players.get(room.sessionId);
            if (myPlayer) {
                const startX = engine.pathfindingManager.toGrid(myPlayer.x);
                const startY = engine.pathfindingManager.toGrid(myPlayer.y);
                const endX = engine.pathfindingManager.toGrid(x);
                const endY = engine.pathfindingManager.toGrid(y);

                const path = engine.pathfindingManager.findPath(startX, startY, endX, endY);
                if (path.length > 0) {
                    if (path.length > 1) path.pop(); 
                    engine.movePlayerAlongPath(room.sessionId, path);
                    if (isRoomConnected()) room.send("movePath", { path: path }); 
                } else {
                    requestDialog(id);
                }
            }
        };

        engine.onPlayerArrived = () => {
            if (pendingInteraction.current) {
                requestDialog(pendingInteraction.current);
                pendingInteraction.current = null;
            }
        };

        const requestDialog = (npcId: string) => {
             if (isRoomConnected()) room.send("npcInteract", { id: npcId });
        };

        if (engine.viewport) {
            engine.viewport.on('clicked', (e) => {
                setDialogData(null);
                pendingInteraction.current = null;
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
                    if (isRoomConnected()) room.send("movePath", { path: path }); 
                }
            });
        }
    };

    launch();

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'KeyI') setIsInventoryOpen(prev => !prev);
        if (e.code === 'Escape') {
            setDialogData(null);
            setIsInventoryOpen(false);
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
      room.removeAllListeners(); // Очистка onMessage
      
      if (engineRef.current) {
          engineRef.current.destroy(); // Внутри GameEngine.destroy() теперь чистятся onAdd/onChange
          engineRef.current = null;
      }
    };
  }, [room]);

  const handleInventorySwap = (fromPos: number, toPos: number) => {
      if (isRoomConnected()) room.send("inventorySwap", { from: fromPos, to: toPos });
  };

  const handleDialogOption = (optionId: number) => {
      if (optionId === -1) { 
          setDialogData(null);
          return;
      }
      if (isRoomConnected()) room.send("dialogResponse", { optionId });
      setDialogData(null); 
  };

  return (
    <div className="relative w-full h-full">
        <canvas ref={canvasRef} className="block w-full h-full bg-slate-900" />
        
        {dialogData && (
            <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                <div className="pointer-events-auto">
                    <DialogModal 
                        data={dialogData}
                        onOptionSelect={handleDialogOption}
                        onClose={() => setDialogData(null)}
                    />
                </div>
            </div>
        )}

        <InventoryModal 
            isOpen={isInventoryOpen}
            inventory={inventoryItems}
            onClose={() => setIsInventoryOpen(false)}
            onSwap={handleInventorySwap}
        />
    </div>
  );
}