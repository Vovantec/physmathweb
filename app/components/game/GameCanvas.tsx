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
    if (!canvasRef.current || engineRef.current) return;

    // 1. Создаем экземпляр
    const engine = new GameEngine();
    engineRef.current = engine;

    // 2. Асинхронно инициализируем
    const initGame = async () => {
        if (!canvasRef.current) return;
        
        await engine.init(canvasRef.current);

        // 3. Подключаем к комнате только после готовности движка
        engine.attachRoom(room);

        // 4. Логика ввода
        engine.viewport.on('clicked', (e) => {
            const world = e.world;
            room.send("move", { x: world.x, y: world.y });
        });
    };

    initGame();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [room]);

  return (
    <canvas 
      ref={canvasRef} 
      className="block w-full h-full bg-slate-900"
    />
  );
}