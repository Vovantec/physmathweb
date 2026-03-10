import Link from 'next/link';
import React from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans flex flex-col md:flex-row selection:bg-yellow-400 selection:text-black">
      
      {/* Боковое меню */}
      <aside className="w-full md:w-72 bg-[#1a1a1a] border-b md:border-b-0 md:border-r border-white/10 flex flex-col shadow-2xl z-10 relative">
        <div className="p-8 border-b border-white/5">
          <h2 className="text-2xl font-extrabold uppercase tracking-widest flex items-center gap-3">
            <span className="text-yellow-400">⚡</span> АДМИН
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-2 tracking-wider">ПАНЕЛЬ УПРАВЛЕНИЯ</p>
        </div>
        
        <nav className="flex flex-col gap-2 flex-grow p-6">
          <Link 
            href="/admin" 
            className="px-5 py-4 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition font-mono text-sm flex items-center gap-3"
          >
            <span>📊</span> Сводка
          </Link>
          <Link 
            href="/admin/news" 
            className="px-5 py-4 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition font-mono text-sm flex items-center gap-3"
          >
            📢 Новости (Админ)
          </Link>
          <Link 
            href="/admin/courses" 
            className="px-5 py-4 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition font-mono text-sm flex items-center gap-3"
          >
            <span>📚</span> Управление курсами
          </Link>

          <Link 
            href="/admin/students" 
            className="px-5 py-4 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition font-mono text-sm flex items-center gap-3"
          >
            <span>👥</span> База студентов
          </Link>
          
          <div className="mt-auto pt-6 border-t border-white/5">
            <Link 
              href="/" 
              className="px-5 py-4 w-full block text-center rounded-lg border border-dashed border-white/20 hover:border-yellow-400 text-gray-400 hover:text-yellow-400 transition font-mono text-sm uppercase tracking-widest"
            >
              ← На сайт
            </Link>
          </div>
        </nav>
      </aside>

      {/* Основной контент */}
      <main className="flex-grow h-screen overflow-y-auto relative">
        {/* Декоративный фоновый паттерн */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '40px 40px'}}>
        </div>
        <div className="relative z-10 p-6 md:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      
    </div>
  );
}