// Убрали импорт next-auth и redirect

export default async function GamePage() {
  // На данном этапе мы просто рендерим контейнер.
  // Позже вы сможете добавить сюда вашу собственную проверку авторизации 
  // (например, чтение JWT токена из cookies или использование вашей функции из lib/admin-auth.ts)

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-black text-white">
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <span className="text-gray-600">Инициализация спутниковой связи... (Загрузка игры)</span>
      </div>

      {/* Позже здесь будет монтироваться React/Colyseus клиент */}
    </div>
  );
}