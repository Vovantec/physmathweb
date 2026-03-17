// app/courses/page.tsx
// Путь: app/courses/page.tsx

'use client'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import SiteHeader from '../components/SiteHeader'
import ReferralHandler, { registerPendingReferral } from '../components/ReferralHandler'
import { useAuth } from '../hooks/useAuth'

interface Course {
  id:          number
  title:       string
  description: string | null
}

export default function CoursesPage() {
  const { user, loading } = useAuth()
  const [courses, setCourses]               = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)

  useEffect(() => {
    if (!user) { setCourses([]); return }
    setCoursesLoading(true)
    fetch('/api/courses')
      .then(r => r.json())
      .then(data => { setCourses(data); setCoursesLoading(false) })
      .catch(() => setCoursesLoading(false))
  }, [user])

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
                  className="group bg-[#1a1a1a] border-2 border-white/10 p-8 rounded-xl hover:border-white transition duration-300 flex flex-col shadow-2xl">
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