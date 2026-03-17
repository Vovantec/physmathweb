// app/admin/layout.tsx
import Link from 'next/link'
import React from 'react'

const NAV_ITEMS = [
  { href: '/admin',               icon: '📊', label: 'Сводка'                },
  { href: '/admin/news',          icon: '📢', label: 'Новости'               },
  { href: '/admin/courses',       icon: '📚', label: 'Курсы'                 },
  { href: '/admin/enrollments',   icon: '📋', label: 'Заявки'                },
  { href: '/admin/deadlines',     icon: '⏰', label: 'Дедлайны и доступ'     },
  { href: '/admin/heatmap',       icon: '🌡️', label: 'Тепловая карта'        },
  { href: '/admin/parent-access', icon: '👨‍👩‍👧', label: 'Доступ для родителей' },
  { href: '/admin/prizes',        icon: '🎁', label: 'Призы'                 },
  { href: '/admin/prizes/pools',  icon: '🏆', label: 'Розыгрыши'             },
  { href: '/admin/students',      icon: '👥', label: 'База студентов'         },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans flex flex-col md:flex-row selection:bg-yellow-400 selection:text-black">
      <aside className="w-full md:w-72 bg-[#1a1a1a] border-b md:border-b-0 md:border-r border-white/10 flex flex-col shadow-2xl z-10 relative">
        <div className="p-8 border-b border-white/5">
          <h2 className="text-2xl font-extrabold uppercase tracking-widest flex items-center gap-3">
            <span className="text-yellow-400">⚡</span> АДМИН
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-2 tracking-wider">ПАНЕЛЬ УПРАВЛЕНИЯ</p>
        </div>
        <nav className="flex flex-col gap-1 flex-grow p-4 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className="px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition font-mono text-sm flex items-center gap-3">
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
          <div className="mt-auto pt-4 border-t border-white/5">
            <Link href="/"
              className="px-4 py-3 w-full block text-center rounded-lg border border-dashed border-white/20 hover:border-yellow-400 text-gray-400 hover:text-yellow-400 transition font-mono text-sm uppercase tracking-widest">
              ← На сайт
            </Link>
          </div>
        </nav>
      </aside>
      <main className="flex-grow h-screen overflow-y-auto relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 p-6 md:p-12 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}