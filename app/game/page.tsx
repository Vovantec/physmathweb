import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
// Здесь позже импортируем новый GameCanvas

export default async function GamePage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect("/"); // или на страницу логина вашей платформы
  }

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-black text-white">
      {/* Высота h-[calc(100vh-64px)] предполагает, что у вас есть верхний навбар платформы (например, 64px).
        Если игра должна быть на полный экран без навбара, используйте h-screen.
      */}
      
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <span className="text-gray-600">Инициализация спутниковой связи... (Загрузка игры)</span>
      </div>

      {/* Позже здесь будет монтироваться React/Colyseus клиент */}
    </div>
  );
}