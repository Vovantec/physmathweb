import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic'; // Отключаем кеширование страницы

export default async function GamePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Await searchParams in Next.js 15+ (or treat as promise compatible)
  const resolvedParams = await searchParams;
  const uidRaw = resolvedParams?.uid;

  if (!uidRaw || typeof uidRaw !== 'string') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center p-4">
          <h1 className="text-2xl font-bold mb-2">Ошибка доступа</h1>
          <p>Не передан ID пользователя. Зайдите через Telegram бота.</p>
        </div>
      </div>
    );
  }

  // Находим пользователя в базе
  const telegramId = BigInt(uidRaw);
  const user = await prisma.user.findUnique({
    where: { telegramId }
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center p-4">
          <h1 className="text-xl mb-2">Пользователь не найден</h1>
          <p>Пожалуйста, нажмите /start в боте для регистрации.</p>
        </div>
      </div>
    );
  }

  // Генерируем токен для входа в игру
  const SECRET = process.env.BOT_TOKEN;
  if (!SECRET) {
      return <div>Ошибка сервера: BOT_TOKEN не настроен</div>;
  }

  const gameToken = jwt.sign(
    { 
        userId: user.telegramId.toString(), 
        username: user.firstName,
        // Можно добавить класс, уровень и т.д., если они есть в БД
    },
    SECRET,
    { expiresIn: '2h' }
  );

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative flex flex-col">
      {/* Верхняя панель (опционально) */}
      <div className="absolute top-0 left-0 w-full z-10 pointer-events-none p-2 flex justify-between text-white text-shadow-md bg-gradient-to-b from-black/50 to-transparent">
        <div className="font-bold">{user.firstName}</div>
        <div>Баллы: {user.points}</div>
      </div>

      {/* Iframe с игрой */}
      <iframe
        src={`/game/index.html?token=${gameToken}`}
        className="w-full h-full border-none flex-grow"
        allow="autoplay; fullscreen; encrypted-media"
        title="PhysMath Game"
      />
    </div>
  );
}