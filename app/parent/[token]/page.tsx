'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface StudentSummary {
  firstName: string | null
  username: string | null
  photoUrl: string | null
  points: number
}

interface CourseStat {
  courseId: number
  courseTitle: string
  attemptCount: number
  avgPercent: number
}

interface HeatmapLesson {
  lessonId: number
  lessonTitle: string
  taskTitle: string
  avgPercent: number | null
  completedCount: number
  studentResults: Array<{
    studentId: number
    status: 'not_started' | 'perfect' | 'partial' | 'failed'
    percent: number | null
    isLate: boolean
  }>
}

function statusColor(status: string, isLate: boolean) {
  if (status === 'not_started') return 'bg-white/5 text-gray-600'
  if (status === 'perfect') return isLate ? 'bg-blue-500/30 text-blue-300' : 'bg-green-500/30 text-green-300'
  if (status === 'partial') return isLate ? 'bg-yellow-600/30 text-yellow-400' : 'bg-yellow-400/20 text-yellow-300'
  return 'bg-red-500/20 text-red-400'
}

function statusLabel(status: string, percent: number | null, isLate: boolean) {
  if (status === 'not_started') return '—'
  const late = isLate ? ' ⏰' : ''
  return `${percent}%${late}`
}

export default function ParentPortalPage() {
  const { token } = useParams() as { token: string }
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)
  const [heatmap, setHeatmap] = useState<HeatmapLesson[] | null>(null)
  const [heatmapLoading, setHeatmapLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/parent/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        setLoading(false)
        if (d.courses?.length === 1) {
          loadHeatmap(d.courses[0].courseId)
        }
      })
      .catch(() => { setError('Ошибка загрузки'); setLoading(false) })
  }, [token])

  const loadHeatmap = (courseId: number) => {
    setSelectedCourse(courseId)
    setHeatmapLoading(true)
    fetch(`/api/parent/${token}?courseId=${courseId}`)
      .then(r => r.json())
      .then(d => {
        setHeatmap(d.heatmap?.lessons ?? null)
        setHeatmapLoading(false)
      })
      .catch(() => setHeatmapLoading(false))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-white font-mono animate-pulse">Загрузка...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Доступ недоступен</h1>
          <p className="text-gray-400 font-mono">{error}</p>
        </div>
      </div>
    )
  }

  const student: StudentSummary = data.student
  const summary = data.summary
  const courses: CourseStat[] = data.courses

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#1a1a1a] px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">
            ФизМат by Шевелев — Портал для родителей
          </div>

          <div className="flex items-center gap-6">
            <img
              src={
                student.photoUrl ??
                `https://ui-avatars.com/api/?name=${student.firstName ?? 'S'}&background=random&size=80`
              }
              alt="avatar"
              className="w-20 h-20 rounded-2xl border-2 border-white/20"
            />
            <div>
              <h1 className="text-3xl font-extrabold uppercase tracking-tight">
                {student.firstName ?? student.username ?? 'Ученик'}
              </h1>
              {data.label && (
                <p className="text-gray-500 font-mono text-sm mt-1">{data.label}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Баллы', value: `${student.points} 💎`, color: 'text-yellow-400' },
            { label: 'Сдано ДЗ', value: `${summary.completedHw} / ${summary.totalAttempts}`, color: 'text-green-400' },
            { label: 'Средний балл', value: `${summary.avgPercent}%`, color: 'text-blue-400' },
            { label: 'Просрочено', value: summary.lateCount, color: summary.lateCount > 0 ? 'text-red-400' : 'text-gray-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
              <span className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">
                {stat.label}
              </span>
              <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Course selector */}
        {courses.length > 1 && (
          <div>
            <h2 className="text-lg font-bold uppercase tracking-widest mb-3">Курсы</h2>
            <div className="flex flex-wrap gap-3">
              {courses.map(c => (
                <button
                  key={c.courseId}
                  onClick={() => loadHeatmap(c.courseId)}
                  className={`px-5 py-3 rounded-xl border text-sm font-bold transition ${
                    selectedCourse === c.courseId
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'
                  }`}
                >
                  {c.courseTitle}
                  <span className="ml-2 text-xs opacity-60">{c.avgPercent}%</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Heatmap */}
        {heatmapLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {heatmap && !heatmapLoading && (
          <div>
            <h2 className="text-lg font-bold uppercase tracking-widest mb-4">
              Тепловая карта знаний
            </h2>
            <p className="text-gray-500 text-sm font-mono mb-5">
              Каждый урок показывает результат выполнения домашнего задания.
              <span className="ml-2 inline-flex gap-2 items-center flex-wrap">
                <span className="bg-green-500/30 text-green-300 px-2 py-0.5 rounded text-xs">100% — отлично</span>
                <span className="bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded text-xs">50–99% — частично</span>
                <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs">&lt;50% — слабо</span>
                <span className="bg-white/5 text-gray-600 px-2 py-0.5 rounded text-xs">— не выполнено</span>
              </span>
            </p>

            <div className="space-y-2">
              {heatmap.map(lesson => {
                // For parent portal, there's only one student
                const result = lesson.studentResults[0]
                const status = result?.status ?? 'not_started'
                const percent = result?.percent ?? null
                const isLate = result?.isLate ?? false

                return (
                  <div
                    key={lesson.lessonId}
                    className="flex items-center gap-4 bg-[#1a1a1a] border border-white/5 rounded-xl p-4"
                  >
                    <div className="flex-grow min-w-0">
                      <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-0.5">
                        {lesson.taskTitle}
                      </div>
                      <div className="font-medium text-white truncate">
                        {lesson.lessonTitle}
                      </div>
                    </div>

                    <div
                      className={`flex-shrink-0 w-24 text-center py-2 rounded-lg text-sm font-bold ${statusColor(status, isLate)}`}
                    >
                      {statusLabel(status, percent, isLate)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}