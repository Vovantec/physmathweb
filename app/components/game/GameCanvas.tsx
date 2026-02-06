'use client';
import { useEffect, useRef } from 'react';
import { GameEngine } from '@/lib/game/GameEngine';
import { Room } from 'colyseus.js';

interface GameCanvasProps {
  room: Room;
}

export default function GameCanvas({ room }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const engine = new GameEngine();
    engineRef.current = engine;
    let isMounted = true;

    const launch = async () => {
        if (!canvasRef.current) return;
        const success = await engine.init(canvasRef.current);
        if (!isMounted || !success) return;

        engine.attachRoom(room);

        // ОБРАБОТКА КЛИКА С ПОИСКОМ ПУТИ
        if (engine.viewport) {
            engine.viewport.on('clicked', (e) => {
                const world = e.world;
                const myPlayer = engine.players.get(room.sessionId);
                if (!myPlayer) return;

                const startX = engine.pathfindingManager.toGrid(myPlayer.x);
                const startY = engine.pathfindingManager.toGrid(myPlayer.y);
                const endX = engine.pathfindingManager.toGrid(world.x);
                const endY = engine.pathfindingManager.toGrid(world.y);

                const path = engine.pathfindingManager.findPath(startX, startY, endX, endY);

                if (path.length > 0) {
                    // 1. Локальная анимация
                    engine.movePlayerAlongPath(room.sessionId, path);
                    // 2. Отправка на сервер
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
    <canvas ref={canvasRef} className="block w-full h-full bg-slate-900" />
  );
}