'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gameNetwork } from '@/lib/game/GameNetwork';
import { Room } from 'colyseus.js';
import dynamic from 'next/dynamic'; // 1. Импортируем dynamic

// 2. Динамический импорт с отключенным SSR
const GameCanvas = dynamic(() => import('@/app/components/game/GameCanvas'), { 
  ssr: false,
  loading: () => <div className="text-white">Загрузка графики...</div>
});

import GameUI from '@/app/components/game/GameUI'; 

export default function GamePage() {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initGame = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          router.push('/'); 
          return;
        }

        const user = JSON.parse(storedUser);
        // В идеале использовать токен, но пока ID как заглушка
        const token = user.telegramId ? user.telegramId.toString() : "guest"; 

        const gameRoom = await gameNetwork.connect(token);
        setRoom(gameRoom);
        
      } catch (err: any) {
        console.error(err);
        setError("Не удалось подключиться к серверу игры. " + err.message);
      } finally {
        setLoading(false);
      }
    };

    initGame();

    return () => {
      gameNetwork.leave();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-2xl animate-pulse">Загрузка мира...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-red-500">
        <div className="text-xl">{error}</div>
        <button onClick={() => window.location.reload()} className="ml-4 px-4 py-2 bg-gray-800 rounded">
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Слой 1: Канвас (Только клиент) */}
      <div className="absolute inset-0 z-0">
        {room && <GameCanvas room={room} />}
      </div>

      {/* Слой 2: UI */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {room && <GameUI room={room} />}
      </div>
    </div>
  );
}