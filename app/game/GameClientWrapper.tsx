"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// GameManager грузим только на клиенте — никакой гидрации
const GameManager = dynamic(
  () => import("@/app/components/game/GameManager"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/10 border-t-green-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-green-400 font-mono text-sm uppercase tracking-widest animate-pulse">
            Инициализация базы...
          </p>
        </div>
      </div>
    )
  }
);

interface GameClientWrapperProps {
  userId: string;
  gameToken: string;
}

export default function GameClientWrapper({ userId, gameToken }: GameClientWrapperProps) {
  // Монтируем только на клиенте — полностью убирает ошибку гидрации
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/10 border-t-green-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-green-400 font-mono text-sm uppercase tracking-widest animate-pulse">
            Загрузка...
          </p>
        </div>
      </div>
    );
  }

  return <GameManager userId={userId} gameToken={gameToken} />;
}