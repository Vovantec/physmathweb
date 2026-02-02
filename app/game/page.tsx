'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gameNetwork } from '@/lib/game/GameNetwork';
import { Room } from 'colyseus.js';
import GameCanvas from '@/app/components/game/GameCanvas';

// Заглушка для UI (будем переносить постепенно)
import GameUI from '@/app/components/game/GameUI'; 

export default function GamePage() {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initGame = async () => {
      try {
        // 1. Получаем токен из localStorage (сохраненный при логине через бота)
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          router.push('/'); 
          return;
        }

        // Внимание: Здесь нам нужен ТОКЕН, который мы должны были получить при логине.
        // Если вы сохраняете только user object, вам нужно обновить логин, чтобы хранить и auth_token.
        // Пока предположим, что мы можем получить его или используем ID (временно небезопасно).
        // В идеале: const token = localStorage.getItem('auth_token');
        
        // Для теста используем "auth_" + userId как в старом коде, 
        // но лучше реализовать нормальную JWT авторизацию.
        const user = JSON.parse(storedUser);
        const token = user.telegramId.toString(); // Или user.token

        // 2. Подключаемся к серверу
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
      {/* Слой 1: Канвас (Игровой мир) */}
      <div className="absolute inset-0 z-0">
        {room && <GameCanvas room={room} />}
      </div>

      {/* Слой 2: UI (Интерфейс) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {room && <GameUI room={room} />}
      </div>
    </div>
  );
}