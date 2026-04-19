// app/components/SiteHeader.tsx
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth, type AuthUser } from '@/app/hooks/useAuth'
import BotLogin from './BotLogin'

interface SiteHeaderProps {
  activePage?: 'news' | 'courses' | 'leaderboard' | 'chat' | 'exams'
  onAuth?: (user: AuthUser) => void
}

export default function SiteHeader({ activePage, onAuth }: SiteHeaderProps) {
  const { user, loading, logout, setUser } = useAuth()
  const [chatUnread, setChatUnread] = useState<{ total: number; muted: boolean } | null>(null)

  useEffect(() => {
    if (!user) { setChatUnread(null); return }
    const fetch_ = () =>
      fetch('/api/chat/unread')
        .then(r => r.json())
        .then(d => setChatUnread(d))
        .catch(() => {})
    fetch_()
    const id = setInterval(fetch_, 15_000)
    return () => clearInterval(id)
  }, [user])

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

  return (
    <>
      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mb-16 border-b border-white/20 pb-6 gap-4 md:gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition flex-shrink-0">
          <span className="text-4xl md:text-5xl">⚛️</span>
          <div className="flex flex-col tracking-tighter uppercase font-sans">
            <span className="text-xs md:text-sm text-yellow-400 font-bold tracking-[0.3em] mb-1 ml-1 opacity-90">
              by Шевелев
            </span>
            <span className="text-4xl md:text-4xl font-extrabold text-white leading-none">
              ФИЗ<span className="text-gray-500">МАТ</span>
            </span>
          </div>
        </Link>

        {/* Nav + auth — single row, no wrap on desktop */}
        <div className="flex gap-2 items-center flex-wrap justify-center">

          <NavLink href="/news"        label="Новости"   active={activePage === 'news'} />
          <NavLink href="/courses"     label="Курсы"     active={activePage === 'courses'} />
          <NavLink href="/exams"       label="Варианты"  active={activePage === 'exams'} />
          <NavLink href="/leaderboard" label="🏆 Рейтинг" active={activePage === 'leaderboard'} />

          {/* Чат с бейджом */}
          <Link
            href="/chat"
            className={`relative flex-shrink-0 py-2.5 px-3 rounded-lg font-bold uppercase tracking-widest text-sm transition ${
              activePage === 'chat'
                ? 'bg-yellow-400 text-black'
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
            }`}
          >
            💬 Чат
            {chatUnread && chatUnread.total > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center leading-none ${
                chatUnread.muted ? 'bg-gray-600 text-gray-300' : 'bg-red-500 text-white'
              }`}>
                {chatUnread.total > 99 ? '99+' : chatUnread.total}
              </span>
            )}
          </Link>

          {user?.isAdmin && (
            <Link
              href="/admin"
              className="flex-shrink-0 text-gray-400 hover:text-white transition font-bold uppercase text-sm tracking-widest border border-transparent hover:border-white/20 px-3 py-2 rounded"
            >
              Админ
            </Link>
          )}

          {/* Auth block */}
          {!loading && (
            user ? (
              <div className="flex-shrink-0 flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 bg-[#1a1a1a] border border-white/15 hover:border-yellow-400/50 px-3 py-2 rounded-xl transition group"
                  title="Открыть профиль"
                >
                  {user.photo ? (
                    <img src={user.photo} alt="ava" className="w-7 h-7 rounded-full ring-1 ring-white/20 flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs flex-shrink-0">👤</div>
                  )}
                  <span className="font-bold text-sm text-gray-300 group-hover:text-yellow-400 transition max-w-[100px] truncate">
                    {user.name ?? `ID: ${user.id}`}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="text-xs text-gray-500 hover:text-red-400 border border-white/10 hover:border-red-500/30 px-3 py-2 rounded-xl transition font-mono uppercase tracking-widest"
                >
                  Выйти
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

      {/* ── FAB: Спросить куратора (только для залогиненных) ── */}
      {user && <AskCuratorFab />}
    </>
  )
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex-shrink-0 py-2.5 px-3 rounded-lg font-bold uppercase tracking-widest text-sm transition ${
        active
          ? 'bg-yellow-400 text-black'
          : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
      }`}
    >
      {label}
    </Link>
  )
}

function AskCuratorFab() {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href="/ask-curator"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold uppercase tracking-widest rounded-full shadow-lg shadow-yellow-400/20 transition-all duration-200"
      style={{
        paddingTop: '14px',
        paddingBottom: '14px',
        paddingLeft: '16px',
        paddingRight: hovered ? '20px' : '16px',
        maxWidth: hovered ? '220px' : '52px',
      }}
      title="Спросить куратора"
    >
      {/* Icon */}
      <span className="text-xl flex-shrink-0">✏️</span>
      {/* Label — появляется при hover */}
      <span
        className="text-sm whitespace-nowrap overflow-hidden transition-all duration-200"
        style={{ maxWidth: hovered ? '160px' : '0px', opacity: hovered ? 1 : 0 }}
      >
        Спросить куратора
      </span>
    </Link>
  )
}