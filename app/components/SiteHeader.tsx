// app/components/SiteHeader.tsx
// Путь: app/components/SiteHeader.tsx
//
// Единая шапка для /courses, /news, /leaderboard.
// Имя пользователя кликабельно и ведёт на /profile.

'use client'
import Link from 'next/link'
import { useAuth, type AuthUser } from '@/app/hooks/useAuth'
import BotLogin from './BotLogin'

interface SiteHeaderProps {
  /** Активная страница — подсвечивает нужную кнопку */
  activePage?: 'news' | 'courses' | 'leaderboard' | 'chat'
  /** Callback после успешного входа (если нужен на странице) */
  onAuth?: (user: AuthUser) => void
}

export default function SiteHeader({ activePage, onAuth }: SiteHeaderProps) {
  const { user, loading, logout, setUser } = useAuth()

  const handleAuth = (userData: any) => {
    const u: AuthUser = {
      id:      userData.id,
      dbId:    userData.dbId ?? userData.id,
      name:    userData.name  ?? null,
      photo:   userData.photo ?? null,
      isAdmin: userData.isAdmin ?? false,
    }
    setUser(u)
    onAuth?.(u)
  }

  const navLinks = [
    { href: '/news',        label: 'Новости',  key: 'news'        },
    { href: '/courses',     label: 'Курсы',    key: 'courses'     },
    { href: '/leaderboard', label: '🏆 Рейтинг', key: 'leaderboard' },
    { href: '/chat',        label: '💬 Чат',   key: 'chat'        },
  ]

  return (
    <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mb-16 border-b border-white/20 pb-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
        <span className="text-4xl md:text-5xl">⚛️</span>
        <div className="flex flex-col tracking-tighter uppercase font-sans">
          <span className="text-xs md:text-sm text-yellow-400 font-bold tracking-[0.3em] mb-1 ml-1 opacity-90">
            by Шевелев
          </span>
          <span className="text-4xl md:text-5xl font-extrabold text-white leading-none">
            ФИЗ<span className="text-gray-500">МАТ</span>
          </span>
        </div>
      </Link>

      {/* Nav + auth */}
      <div className="flex gap-3 items-center mt-6 md:mt-0 flex-wrap justify-center">
        {navLinks.map(link => (
          <Link
            key={link.key}
            href={link.href}
            className={`flex-shrink-0 py-2.5 px-4 rounded-lg font-bold uppercase tracking-widest text-sm transition ${
              activePage === link.key
                ? 'bg-yellow-400 text-black'
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
            }`}
          >
            {link.label}
          </Link>
        ))}

        {user?.isAdmin && (
          <Link
            href="/admin"
            className="flex-shrink-0 text-gray-400 hover:text-white transition font-bold uppercase text-sm tracking-widest border border-transparent hover:border-white/20 px-4 py-2 rounded"
          >
            Админ
          </Link>
        )}

        {/* Auth block */}
        {!loading && (
          user ? (
            <div className="flex-shrink-0 flex items-center gap-2 bg-[#1a1a1a] border border-white/20 pl-1 pr-3 py-1 rounded-full shadow-lg">
              {user.photo && (
                <img src={user.photo} alt="ava"
                  className="w-8 h-8 rounded-full ring-2 ring-white/30 flex-shrink-0" />
              )}

              {/* Кликабельное имя — ведёт на /profile */}
              <Link
                href="/profile"
                className="font-bold text-sm text-gray-200 hover:text-yellow-400 transition underline decoration-dotted underline-offset-2 decoration-white/30 hover:decoration-yellow-400 px-1"
                title="Открыть профиль"
              >
                {user.name ?? `ID: ${user.id}`}
              </Link>

              <button
                onClick={logout}
                className="text-xs text-gray-600 hover:text-red-400 transition ml-1"
                title="Выйти"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex-shrink-0">
              <BotLogin onAuth={handleAuth} />
            </div>
          )
        )}
      </div>
    </header>
  )
}