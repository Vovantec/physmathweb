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

    // 1. Инициализируем движок
    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    // 2. Подключаем к комнате
    engine.attachRoom(room);

    // 3. Отправка кликов для движения (Временная логика)
    engine.viewport.on('clicked', (e) => {
        const world = e.world;
        room.send("move", { x: world.x, y: world.y });
    });

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