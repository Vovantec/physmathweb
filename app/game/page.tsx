'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gameNetwork } from '@/lib/game/GameNetwork';
import { Room } from 'colyseus.js';
import dynamic from 'next/dynamic';

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
        const userId = user.telegramId ? user.telegramId.toString() : user.id.toString();

        // 1. Получаем свежий игровой токен с сайта
        const response = await fetch('/api/auth/game-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, username: user.username })
        });

        if (!response.ok) throw new Error("Failed to get game token");
        
        const data = await response.json();
        const gameToken = data.token;

        // 2. Подключаемся к серверу с валидным JWT
        const gameRoom = await gameNetwork.connect(gameToken);
        setRoom(gameRoom);
        
      } catch (err: any) {
        console.error("Game Connection Error:", err);
        setError(`Ошибка подключения: ${err.message || String(err)}`);
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