"use client";

import { useEffect, useState } from "react";
import * as Colyseus from "colyseus.js";

interface GameManagerProps {
  userId: number; // ID пользователя из вашей базы данных
}

export default function GameManager({ userId }: GameManagerProps) {
  const [status, setStatus] = useState<string>("Подключение к спутникам...");
  const [baseData, setBaseData] = useState<any>(null);

  useEffect(() => {
    // Указываем адрес нашего MMO-сервера
    const client = new Colyseus.Client(
      process.env.NEXT_PUBLIC_GAME_SERVER_URL || "ws://localhost:2567"
    );

    let room: Colyseus.Room;

    const connectToBase = async () => {
      try {
        setStatus("Авторизация на базе...");
        
        // Подключаемся к комнате 'base_room' и передаем userId
        room = await client.joinOrCreate("base_room", { userId });
        
        setStatus(`Соединение установлено! Командир ID: ${userId}`);

        // Слушаем изменения состояния базы от сервера
        room.onStateChange((state) => {
          console.log("Новое состояние базы:", state);
          setBaseData(state);
        });

        room.onLeave((code) => {
          setStatus("Связь с базой потеряна. Переподключение...");
        });

      } catch (e) {
        console.error("Ошибка подключения:", e);
        setStatus("Ошибка подключения к серверу. Доступ запрещен.");
      }
    };

    connectToBase();

    // Очистка при размонтировании компонента
    return () => {
      if (room) {
        room.leave();
      }
    };
  }, [userId]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
      <div className="bg-gray-900/80 p-6 rounded-xl border border-gray-700 pointer-events-auto shadow-2xl text-center">
        <h2 className="text-xl font-bold text-green-400 mb-4">Терминал Управления</h2>
        <p className="text-gray-300 mb-2">{status}</p>
        
        {baseData && (
          <div className="mt-4 p-4 bg-black/50 rounded border border-gray-600 text-left text-sm text-blue-300">
            <p>ID Владельца: {baseData.ownerId}</p>
            {/* Позже мы добавим сюда вывод ресурсов и рендер 2D/3D сцены */}
          </div>
        )}
      </div>
    </div>
  );
}