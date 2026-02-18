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

  const [dialogData, setDialogData] = useState<DialogData | null>(null);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);

  const isRoomConnected = () => room && room.connection && room.connection.isOpen;

  useEffect(() => {
    room.removeAllListeners();

    room.onMessage("dialog", (data: DialogData) => setDialogData(data));
    room.onMessage("inventory", (items: Item[]) => setInventoryItems(items));
    room.onMessage("notification", (data: {text: string, color: string}) => {
        console.log("Notification:", data.text); 
    });

    room.send("requestInventory");

    if (engineRef.current) return;

    const engine = new GameEngine();
    engineRef.current = engine;
    let isMounted = true;

    const launch = async () => {
        if (!canvasRef.current) return;
        const success = await engine.init(canvasRef.current);
        if (!isMounted || !success) return;

        engine.attachRoom(room);

        // 1. Клик по мобу
        engine.onMobInteract = (id: string) => {
            console.log("React: Start battle with", id);
            if (isRoomConnected()) {
                room.send("startBattle", { mobId: id });
            }
        };

        // 2. Клик по NPC
        engine.onNpcInteract = (id, x, y) => {
            if (isRoomConnected()) room.send("npcInteract", { id });
        };

        // 3. Клик по ЗЕМЛЕ (Фон)
        engine.onGroundClick = (x: number, y: number) => {
            setDialogData(null); 

            const myPlayer = engine.players.get(room.sessionId);
            if (!myPlayer) return;

            const startX = engine.pathfindingManager.toGrid(myPlayer.x);
            const startY = engine.pathfindingManager.toGrid(myPlayer.y);
            const endX = engine.pathfindingManager.toGrid(x);
            const endY = engine.pathfindingManager.toGrid(y);

            const path = engine.pathfindingManager.findPath(startX, startY, endX, endY);
            if (path.length > 0) {
                if (path.length > 1) path.pop(); 
                engine.movePlayerAlongPath(room.sessionId, path);
                if (isRoomConnected()) room.send("movePath", { path });
            }
        };
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
      room.removeAllListeners();
      if (engineRef.current) {
          engineRef.current.destroy();
          engineRef.current = null;
      }
    };
  }, [room]);

  const handleInventorySwap = (fromPos: number, toPos: number) => {
      if (isRoomConnected()) room.send("inventorySwap", { from: fromPos, to: toPos });
  };

  const handleDialogOption = (optionId: number) => {
      if (optionId === -1) { setDialogData(null); return; }
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