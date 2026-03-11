import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import GameManager from "../components/game/GameManager";
import { prisma } from "@/lib/prisma"; // Путь к вашему клиенту Prisma

// Эта функция симулирует получение текущего пользователя из вашей кастомной авторизации.
// Замените логику внутри на вашу реальную проверку токена/сессии.
async function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value; // Название вашей куки

  if (!token) return null;

  // Пример: поиск пользователя в БД по токену или Telegram ID
  // Вам нужно адаптировать это под вашу функцию авторизации (например, lib/admin-auth.ts)
  const authRecord = await prisma.authCode.findUnique({
    where: { token },
    include: { user: true } // Допустим, связь настроена так
  });

  return authRecord?.user;
}

export default async function GamePage() {
  const user = await getCurrentUser();
  
  if (!user || !user.id) {
    // Если игрок не авторизован - отправляем на главную
    redirect("/"); 
  }

  // Проверяем, есть ли у пользователя созданная база. Если нет - можно будет создать ее здесь позже.
  const base = await prisma.base.findUnique({
    where: { userId: user.id }
  });

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-black text-white">
      {/* Рендерим 2D/3D фон */}
      <div className="absolute inset-0 flex items-center justify-center z-0 bg-[url('/globe.svg')] bg-center bg-no-repeat opacity-20">
      </div>

      {/* Запускаем менеджер соединения с Colyseus */}
      <GameManager userId={user.id} />
    </div>
  );
}