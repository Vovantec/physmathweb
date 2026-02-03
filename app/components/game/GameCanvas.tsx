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

    const engine = new GameEngine();
    engineRef.current = engine;

    const start = async () => {
        if (!canvasRef.current) return;
        
        // Инициализация v8
        await engine.init(canvasRef.current);
        
        // Подключаем комнату после готовности Pixi
        engine.attachRoom(room);

        // Обработка кликов
        engine.viewport.on('clicked', (e) => {
            const world = e.world;
            room.send("move", { x: world.x, y: world.y });
        });
    };

    start();

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