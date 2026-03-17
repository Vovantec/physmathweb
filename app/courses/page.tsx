'use client'
import { useEffect, useState, Suspense } from 'react'

import Link from 'next/link'
import SiteHeader from '../components/SiteHeader'
import ReferralHandler, { registerPendingReferral } from '../components/ReferralHandler'
import { useAuth } from '../hooks/useAuth'

export const dynamic = 'force-dynamic'

interface Course {
  id: number
  title: string
  description: string | null
  courseType: string
  maxStudents: number | null
  enrollmentStatus?: string | null
  tasks?: any[]
}

type Tab = 'mine' | 'self' | 'group'

const TAB_INFO: Record<Tab, { label: string; emoji: string; hint: string }> = {
  mine: {
    label: 'Мои курсы',
    emoji: '📚',
    hint: 'Курсы, к которым у вас есть доступ. Здесь отображаются все одобренные записи.',
  },
  self: {
    label: 'Заочные',
    emoji: '🖥️',
    hint: 'Проходите в своём темпе, без преподавателя. Записывайтесь и учитесь когда удобно. В будущем доступны по подписке.',
  },
  group: {
    label: 'Очные',
    emoji: '👨‍🏫',
    hint: 'Занятия с преподавателем. Ограниченное количество мест. Преподаватель открывает задания после разбора темы.',
  },
}

export default function CoursesPage() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<Tab>('mine')
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [applyingId, setApplyingId] = useState<number | null>(null)
  const [hintTab, setHintTab] = useState<Tab | null>(null)

  useEffect(() => {
    if (!user) { setAllCourses([]); return }
    setCoursesLoading(true)
    fetch(`/api/courses?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        // Guard: API must return array
        if (Array.isArray(data)) {
          setAllCourses(data)
        } else {
          console.error('[courses] API returned non-array:', data)
          setAllCourses([])
        }
        setCoursesLoading(false)
      })
      .catch(err => {
        console.error('[courses] fetch error:', err)
        setCoursesLoading(false)
      })
  }, [user])

  const handleApply = async (courseId: number) => {
    if (!user) return
    setApplyingId(courseId)
    try {
      const res = await fetch(`/api/courses/${courseId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setAllCourses(prev =>
          prev.map(c => c.id === courseId ? { ...c, enrollmentStatus: data.status } : c)
        )
      } else {
        alert(data.error || 'Ошибка при подаче заявки')
      }
    } finally {
      setApplyingId(null)
    }
  }

  const mineCourses = Array.isArray(allCourses) ? allCourses.filter(c => c.enrollmentStatus === 'active') : []
  const selfCourses = Array.isArray(allCourses) ? allCourses.filter(c => c.courseType === 'self') : []
  const groupCourses = Array.isArray(allCourses) ? allCourses.filter(c => c.courseType === 'group') : []

  const visibleCourses: Course[] =
    tab === 'mine' ? mineCourses :
    tab === 'self' ? selfCourses :
    groupCourses

  const isLoading = loading || (!!user && coursesLoading)

  return (
    <div className="min-h-screen flex flex-col items-center p-8 bg-[#121212] text-white">
      <Suspense fallback={null}>
        <ReferralHandler />
      </Suspense>

      <SiteHeader
        activePage="courses"
        onAuth={() => setTimeout(registerPendingReferral, 500)}
      />

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
                Авторизуйтесь через Telegram.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-8 flex-wrap">
              {(Object.keys(TAB_INFO) as Tab[]).map(t => (
                <div key={t} className="relative flex items-center gap-1">
                  <button
                    onClick={() => setTab(t)}
                    className={`px-5 py-2.5 rounded-lg font-bold uppercase tracking-widest text-sm transition flex items-center gap-2 ${
                      tab === t
                        ? 'bg-yellow-400 text-black'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                    }`}
                  >
                    <span>{TAB_INFO[t].emoji}</span>
                    {TAB_INFO[t].label}
                    {t === 'mine' && mineCourses.length > 0 && (
                      <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-black/20 text-black' : 'bg-yellow-400/20 text-yellow-400'}`}>
                        {mineCourses.length}
                      </span>
                    )}
                  </button>
                  {/* Info button */}
                  <button
                    onClick={() => setHintTab(hintTab === t ? null : t)}
                    className="w-5 h-5 rounded-full border border-white/30 text-white/50 hover:text-white hover:border-white/60 text-xs flex items-center justify-center transition"
                    title="Что это?"
                  >
                    !
                  </button>
                </div>
              ))}
            </div>

            {/* Hint box */}
            {hintTab && (
              <div className="mb-6 bg-[#1a1a1a] border border-yellow-400/30 rounded-xl p-4 flex gap-3 items-start">
                <span className="text-2xl">{TAB_INFO[hintTab].emoji}</span>
                <div>
                  <span className="font-bold text-yellow-400 text-sm uppercase tracking-widest">{TAB_INFO[hintTab].label}</span>
                  <p className="text-gray-400 text-sm font-mono mt-1">{TAB_INFO[hintTab].hint}</p>
                </div>
                <button onClick={() => setHintTab(null)} className="ml-auto text-gray-500 hover:text-white transition text-lg">✕</button>
              </div>
            )}

            {/* Pending enrollments notice */}
            {tab === 'mine' && allCourses.some(c => c.enrollmentStatus === 'pending') && (
              <div className="mb-6 bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex gap-3 items-center">
                <span className="text-xl">⏳</span>
                <p className="text-blue-300 text-sm font-mono">
                  У вас есть заявки на рассмотрении. Администратор получит уведомление и одобрит их в ближайшее время.
                </p>
              </div>
            )}

            {visibleCourses.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-xl">
                {tab === 'mine' ? (
                  <div>
                    <p className="text-gray-400 text-xl font-mono mb-4">У вас пока нет доступных курсов.</p>
                    <p className="text-gray-500 text-sm font-mono">Выберите вкладку «Заочные» или «Очные», чтобы записаться.</p>
                  </div>
                ) : (
                  <p className="text-gray-400 text-xl font-mono">Курсов этого типа пока нет.</p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-10">
                  <div className="h-1 bg-white flex-grow opacity-20 rounded" />
                  <h2 className="text-3xl font-bold uppercase tracking-widest text-center">
                    {TAB_INFO[tab].label}
                  </h2>
                  <div className="h-1 bg-white flex-grow opacity-20 rounded" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {visibleCourses.map(course => {
                    const status = course.enrollmentStatus
                    const isActive = status === 'active'
                    const isPending = status === 'pending'
                    const isRejected = status === 'rejected'
                    const isGroup = course.courseType === 'group'

                    return (
                      <div
                        key={course.id}
                        className={`group bg-[#1a1a1a] border-2 p-8 rounded-xl flex flex-col shadow-2xl transition duration-300 ${
                          isActive
                            ? 'border-white/10 hover:border-white'
                            : 'border-white/5 hover:border-white/20'
                        }`}
                      >
                        {/* Badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                            isGroup
                              ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}>
                            {isGroup ? '👨‍🏫 Очный' : '🖥️ Заочный'}
                          </span>
                          {isGroup && course.maxStudents && (
                            <span className="text-xs font-mono text-gray-500">
                              до {course.maxStudents} чел.
                            </span>
                          )}
                        </div>

                        <h3 className={`text-2xl font-bold mb-4 uppercase tracking-tight transition ${
                          isActive ? 'text-white group-hover:text-yellow-400' : 'text-gray-300'
                        }`}>
                          {course.title}
                        </h3>
                        <p className="text-gray-400 mb-8 flex-grow leading-relaxed font-mono text-sm border-l-2 border-white/10 pl-4">
                          {course.description || 'Описание отсутствует...'}
                        </p>

                        {/* Action */}
                        {isActive ? (
                          <Link
                            href={`/course/${course.id}`}
                            className="mt-auto w-full text-center bg-white text-black font-extrabold uppercase tracking-widest px-6 py-4 rounded hover:bg-yellow-400 transition transform active:scale-95"
                          >
                            Перейти к курсу
                          </Link>
                        ) : isPending ? (
                          <div className="mt-auto w-full text-center bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 font-bold uppercase tracking-widest px-6 py-4 rounded font-mono text-sm">
                            ⏳ Заявка на рассмотрении
                          </div>
                        ) : (
                          <button
                            onClick={() => handleApply(course.id)}
                            disabled={applyingId === course.id}
                            className="mt-auto w-full text-center bg-white/10 hover:bg-white/20 text-white border border-white/20 font-extrabold uppercase tracking-widest px-6 py-4 rounded transition transform active:scale-95 disabled:opacity-50"
                          >
                            {applyingId === course.id
                              ? '...'
                              : isRejected
                              ? '↩ Подать заявку повторно'
                              : isGroup
                              ? 'Подать заявку'
                              : 'Записаться'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}