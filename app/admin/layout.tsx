import { checkAdminAuth } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Вызываем нашу проверку
  const isAdmin = await checkAdminAuth();

  // Если не админ — редирект на главную (или на страницу входа)
  if (!isAdmin) {
    redirect('/'); 
  }

  // Если админ — показываем интерфейс
  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Боковая панель */}
      <aside className="w-64 bg-gray-800 p-4 border-r border-gray-700 hidden md:block">
        <h2 className="text-xl font-bold mb-6 text-purple-400">PhysMath Admin</h2>
        <nav className="space-y-2">
          <a href="/admin/courses" className="block p-2 hover:bg-gray-700 rounded transition">
            📚 Курсы
          </a>
          <div className="border-t border-gray-700 my-2 pt-2">
            <a href="/" className="block p-2 text-gray-400 hover:text-white transition">
              ← На сайт
            </a>
          </div>
        </nav>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}