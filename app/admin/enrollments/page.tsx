'use client'
import { useState, useEffect } from 'react'

interface Enrollment {
  id: number
  enrolledAt: string
  status: string
  user: {
    id: number
    firstName: string | null
    username: string | null
    photoUrl: string | null
    telegramId: string
  }
  course: {
    id: number
    title: string
    courseType: string
    maxStudents: number | null
  }
}

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/enrollments')
      .then(r => r.json())
      .then(data => { setEnrollments(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handle = async (enrollmentId: number, action: 'approve' | 'reject') => {
    setProcessingId(enrollmentId)
    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId, action }),
      })
      if (res.ok) {
        setEnrollments(prev => prev.filter(e => e.id !== enrollmentId))
      } else {
        const data = await res.json()
        alert(data.error || 'Ошибка')
      }
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">Заявки на курсы</h1>
        <div className="h-px bg-white/20 flex-grow" />
        {enrollments.length > 0 && (
          <span className="bg-yellow-400 text-black font-bold font-mono px-3 py-1 rounded text-sm">
            {enrollments.length} ожидают
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-white font-mono animate-pulse text-center py-20">Загрузка...</div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-xl">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-gray-400 font-mono">Нет новых заявок на рассмотрении.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {enrollments.map(e => {
            const isGroup = e.course.courseType === 'group'
            return (
              <div
                key={e.id}
                className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 flex flex-col md:flex-row gap-4 md:items-center"
              >
                {/* Student */}
                <div className="flex items-center gap-3 flex-grow min-w-0">
                  <img
                    src={
                      e.user.photoUrl ??
                      `https://ui-avatars.com/api/?name=${e.user.firstName ?? 'S'}&background=random`
                    }
                    alt=""
                    className="w-11 h-11 rounded-full border border-white/10 flex-shrink-0"
                  />
                  <div>
                    <div className="font-bold text-white">
                      {e.user.firstName ?? e.user.username ?? `ID: ${e.user.telegramId}`}
                    </div>
                    {e.user.username && (
                      <div className="text-xs text-gray-500 font-mono">@{e.user.username}</div>
                    )}
                  </div>
                </div>

                {/* Course */}
                <div className="flex-grow min-w-0">
                  <div className="font-medium text-white truncate">{e.course.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                      isGroup
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                      {isGroup ? '👨‍🏫 Очный' : '🖥️ Заочный'}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {new Date(e.enrolledAt).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handle(e.id, 'approve')}
                    disabled={processingId === e.id}
                    className="px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest bg-green-600 hover:bg-green-500 text-white transition disabled:opacity-40"
                  >
                    {processingId === e.id ? '...' : '✓ Одобрить'}
                  </button>
                  <button
                    onClick={() => handle(e.id, 'reject')}
                    disabled={processingId === e.id}
                    className="px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition disabled:opacity-40"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}