// app/courses/page.tsx
// Путь: app/courses/page.tsx

'use client'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import BotLogin from '../components/BotLogin'
import ReferralHandler, { registerPendingReferral } from '../components/ReferralHandler'
import { useAuth } from '../hooks/useAuth'

interface Course {
  id:          number
  title:       string
  description: string | null
}

export default function CoursesPage() {
  const { user, loading, logout, setUser } = useAuth()
  const [courses, setCourses]   = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)

  // Load courses whenever user becomes known and authenticated
  useEffect(() => {
    if (!user) { setCourses([]); return }

    setCoursesLoading(true)
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => { setCourses(data); setCoursesLoading(false) })
      .catch(() => setCoursesLoading(false))
  }, [user])

  const handleAuth = (userData: any) => {
    setUser({
      id:      userData.id,
      dbId:    userData.dbId ?? userData.id,
      name:    userData.name   ?? null,
      photo:   userData.photo  ?? null,
      isAdmin: userData.isAdmin ?? false,
    })
    setTimeout(registerPendingReferral, 500)
  }

  const isLoading = loading || (!!user && coursesLoading)

  return (
    <div className="min-h-screen flex flex-col items-center p-8 bg-[#121212] text-white">
      <Suspense fallback={null}>
        <ReferralHandler />
      </Suspense>

      {/* Header */}
      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mb-16 border-b border-white/20 pb-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl md:text-5xl">⚛️</span>
          <h1 className="flex flex-col tracking-tighter uppercase font-sans">
            <span className="text-xs md:text-sm text-yellow-400 font-bold tracking-[0.3em] mb-1 ml-1 opacity-90">
              by Шевелев
            </span>
            <span className="text-4xl md:text-5xl font-extrabold text-white leading-none">
              ФИЗ<span className="text-gray-500">МАТ</span>
            </span>
          </h1>
        </div>

        <div className="flex gap-4 items-center mt-6 md:mt-0 flex-wrap justify-center">
          <Link href="/news"
            className="flex-shrink-0 py-3 px-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold uppercase tracking-widest rounded-lg transition text-sm">
            Новости
          </Link>
          <Link href="/leaderboard"
            className="flex-shrink-0 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold uppercase tracking-widest rounded-lg transition text-sm">
            🏆 Рейтинг
          </Link>

          {user?.isAdmin && (
            <Link href="/admin"
              className="flex-shrink-0 text-gray-400 hover:text-white transition font-bold uppercase text-sm tracking-widest border border-transparent hover:border-white/20 px-4 py-2 rounded">
              Админ-панель
            </Link>
          )}

          {/* Auth block */}
          {!loading && (
            user ? (
              <div className="flex-shrink-0 flex items-center gap-3 bg-[#1a1a1a] border border-white/20 px-4 py-2 rounded-full shadow-lg">
                {user.photo && (
                  <img src={user.photo} alt="ava" className="w-8 h-8 rounded-full ring-2 ring-white/50" />
                )}
                <Link href="/profile"
                  className="font-bold text-gray-200 hover:text-yellow-400 transition text-sm">
                  {user.name || `ID: ${user.id}`}
                </Link>
                <button
                  onClick={logout}
                  className="text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-wider ml-1"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <div className="flex-shrink-0 h-[40px] w-auto">
                <BotLogin onAuth={handleAuth} />
              </div>
            )
          )}
        </div>
      </header>

      {/* Main */}
      <main className="w-full max-w-6xl flex-grow flex flex-col">
        {isLoading ? (
          <div className="flex justify-center py-20 flex-grow items-center">
            <div className="text-center">
              <div className="inline-block w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
              <p className="text-xl text-gray-400 font-mono tracking-widest">ЗАГРУЗКА...</p>
            </div>
          </div>
        ) : !user ? (
          <div className="flex-grow flex items-center justify-center py-10">
            <div className="max-w-lg w-full bg-[#1a1a1a] border-2 border-dashed border-white/20 p-10 rounded-xl text-center shadow-2xl">
              <h2 className="text-3xl font-extrabold uppercase tracking-tight mb-4">Доступ закрыт</h2>
              <p className="text-gray-400 mb-8 font-mono text-sm leading-relaxed">
                Материалы курса доступны только зарегистрированным студентам.
                Пожалуйста, авторизуйтесь через Telegram.
              </p>
              <div className="flex justify-center transform scale-110">
                <BotLogin onAuth={handleAuth} />
              </div>
            </div>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-xl">
            <p className="text-gray-400 text-xl font-mono">Курсы пока не добавлены.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-10">
              <div className="h-1 bg-white flex-grow opacity-20 rounded" />
              <h2 className="text-3xl font-bold uppercase tracking-widest text-center">Доступные курсы</h2>
              <div className="h-1 bg-white flex-grow opacity-20 rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map(course => (
                <div key={course.id}
                  className="group relative bg-[#1a1a1a] border-2 border-white/10 p-8 rounded-xl hover:border-white transition duration-300 flex flex-col shadow-2xl overflow-hidden">
                  <h3 className="text-2xl font-bold mb-4 text-white uppercase tracking-tight group-hover:text-yellow-400 transition">
                    {course.title}
                  </h3>
                  <p className="text-gray-400 mb-8 flex-grow leading-relaxed font-mono text-sm border-l-2 border-white/10 pl-4">
                    {course.description || 'Описание отсутствует...'}
                  </p>
                  <Link href={`/course/${course.id}`}
                    className="mt-auto w-full text-center bg-white text-black font-extrabold uppercase tracking-widest px-6 py-4 rounded hover:bg-yellow-400 transition transform active:scale-95">
                    Начать
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}