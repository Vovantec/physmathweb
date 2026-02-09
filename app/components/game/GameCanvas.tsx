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

  // Хелпер для проверки соединения
  const isRoomConnected = () => {
      return room && room.connection && room.connection.isOpen;
  };

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

        // ==========================================
        // 1. ЛОГИКА ДИАЛОГОВ (NPC)
        // ==========================================
        
        engine.onNpcInteract = (id, x, y) => {
            console.log("React: Clicked NPC, walking to...", id);
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
                    
                    // БЕЗОПАСНАЯ ОТПРАВКА
                    if (isRoomConnected()) {
                        room.send("movePath", { path: path }); 
                    }
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

        room.onMessage("dialog", (data: DialogData) => {
            setDialogData(data);
        });
        
        const requestDialog = (npcId: string) => {
             if (isRoomConnected()) {
                 console.log("React: Requesting dialog for:", npcId);
                 room.send("npcInteract", { id: npcId });
             } else {
                 console.warn("Cannot request dialog: Connection lost");
             }
        };


        // ==========================================
        // 2. ЛОГИКА ИНВЕНТАРЯ
        // ==========================================

        room.onMessage("inventory", (items: Item[]) => {
            console.log("React: Inventory update", items);
            setInventoryItems(items);
        });

        if (isRoomConnected()) {
            room.send("requestInventory");
        }

        // ==========================================
        // 3. ОБЩИЕ СОБЫТИЯ (Клик по земле)
        // ==========================================
        
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
                    // Локальное движение всегда работает (для плавности)
                    engine.movePlayerAlongPath(room.sessionId, path);
                    
                    // БЕЗОПАСНАЯ ОТПРАВКА НА СЕРВЕР
                    // Исправление ошибки "WebSocket is already in CLOSING or CLOSED state"
                    if (isRoomConnected()) {
                        room.send("movePath", { path: path }); 
                    } else {
                        console.warn("Server disconnected. Movement not synced.");
                    }
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
      if (engineRef.current) {
          engineRef.current.destroy();
          engineRef.current = null;
      }
    };
  }, [room]);

  // --- HANDLERS ---

  const handleInventorySwap = (fromPos: number, toPos: number) => {
      if (isRoomConnected()) {
          console.log(`Swap request: ${fromPos} -> ${toPos}`);
          room.send("inventorySwap", { from: fromPos, to: toPos });
      }
  };

  const handleDialogOption = (optionId: number) => {
      if (optionId === -1) { 
          setDialogData(null);
          return;
      }
      if (isRoomConnected()) {
          room.send("dialogResponse", { optionId });
      }
      setDialogData(null); 
  };

  return (
    <div className="relative w-full h-full">
        <canvas ref={canvasRef} className="block w-full h-full bg-slate-900" />
        
        {/* Диалоги */}
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

        {/* Инвентарь */}
        <InventoryModal 
            isOpen={isInventoryOpen}
            inventory={inventoryItems}
            onClose={() => setIsInventoryOpen(false)}
            onSwap={handleInventorySwap}
        />
    </div>
  );
}