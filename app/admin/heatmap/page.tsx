'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

function cellColor(status: string, isLate: boolean) {
  if (status === 'not_started') return 'bg-white/5'
  if (status === 'perfect')     return isLate ? 'bg-blue-500/40' : 'bg-green-500/50'
  if (status === 'partial')     return isLate ? 'bg-yellow-600/40' : 'bg-yellow-400/30'
  return 'bg-red-500/30'
}

function cellText(percent: number | null, isLate: boolean) {
  if (percent === null) return ''
  return `${percent}${isLate ? '⏰' : ''}`
}

export default function AdminHeatmapPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)
  const [heatmap, setHeatmap] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<{
    lesson: string; student: string; percent: number | null; isLate: boolean
  } | null>(null)

  useEffect(() => {
    fetch('/api/courses').then(r => r.json()).then(setCourses)
  }, [])

  const loadHeatmap = (courseId: number) => {
    setSelectedCourse(courseId)
    setLoading(true)
    fetch(`/api/admin/heatmap?courseId=${courseId}`)
      .then(r => r.json())
      .then(d => { setHeatmap(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const avgColor = (avg: number | null) => {
    if (avg === null) return 'text-gray-600'
    if (avg >= 80) return 'text-green-400'
    if (avg >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">
          Тепловая карта знаний
        </h1>
        <div className="h-px bg-white/20 flex-grow" />
      </div>

      {/* Course selector */}
      <div className="flex flex-wrap gap-3 mb-8">
        {courses.map((c: any) => (
          <button
            key={c.id}
            onClick={() => loadHeatmap(c.id)}
            className={`px-5 py-2.5 rounded-lg border text-sm font-bold transition ${
              selectedCourse === c.id
                ? 'bg-white text-black border-white'
                : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-white font-mono animate-pulse text-center py-20">
          Загрузка данных...
        </div>
      )}

      {heatmap && !loading && (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-6 text-xs font-mono">
            {[
              { color: 'bg-green-500/50', label: '100% — отлично' },
              { color: 'bg-blue-500/40', label: '100% с опозданием' },
              { color: 'bg-yellow-400/30', label: '50–99%' },
              { color: 'bg-yellow-600/40', label: '50–99% с опозданием' },
              { color: 'bg-red-500/30', label: '<50%' },
              { color: 'bg-white/5', label: 'Не выполнено' },
            ].map(item => (
              <span key={item.label} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded ${item.color} border border-white/10`} />
                {item.label}
              </span>
            ))}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
              <span className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-1">Учеников</span>
              <span className="text-2xl font-black">{heatmap.students.length}</span>
            </div>
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
              <span className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-1">Уроков</span>
              <span className="text-2xl font-black">{heatmap.lessons.length}</span>
            </div>
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
              <span className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-1">Средний % по курсу</span>
              <span className={`text-2xl font-black ${avgColor(
                heatmap.lessons.length > 0
                  ? Math.round(heatmap.lessons.filter((l: any) => l.avgPercent !== null).reduce((s: number, l: any) => s + l.avgPercent, 0) /
                    Math.max(heatmap.lessons.filter((l: any) => l.avgPercent !== null).length, 1))
                  : null
              )}`}>
                {heatmap.lessons.length > 0
                  ? Math.round(heatmap.lessons.filter((l: any) => l.avgPercent !== null).reduce((s: number, l: any) => s + l.avgPercent, 0) /
                    Math.max(heatmap.lessons.filter((l: any) => l.avgPercent !== null).length, 1))
                  : 0}%
              </span>
            </div>
          </div>

          {/* Heatmap grid */}
          <div className="overflow-x-auto pb-4">
            <div className="min-w-max">
              {/* Header row */}
              <div className="flex gap-px mb-px">
                {/* Student name column header */}
                <div className="w-48 flex-shrink-0" />
                {heatmap.lessons.map((lesson: any) => (
                  <div
                    key={lesson.lessonId}
                    className="w-16 flex-shrink-0 text-center"
                    title={`${lesson.taskTitle}: ${lesson.lessonTitle}`}
                  >
                    <div className="text-[10px] font-mono text-gray-500 truncate px-1 pb-1 rotate-0">
                      {lesson.lessonTitle.slice(0, 8)}
                    </div>
                    <div className={`text-xs font-bold ${avgColor(lesson.avgPercent)} pb-1`}>
                      {lesson.avgPercent !== null ? `${lesson.avgPercent}%` : '—'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Student rows */}
              {heatmap.students.map((student: any) => (
                <div key={student.id} className="flex gap-px mb-px items-center">
                  {/* Student name */}
                  <div className="w-48 flex-shrink-0 flex items-center gap-2 pr-3">
                    <img
                      src={
                        student.photoUrl ??
                        `https://ui-avatars.com/api/?name=${student.firstName ?? 'S'}&background=random&size=32`
                      }
                      alt=""
                      className="w-7 h-7 rounded-full border border-white/10 flex-shrink-0"
                    />
                    <span className="text-xs font-mono text-gray-300 truncate">
                      {student.firstName ?? student.username ?? '?'}
                    </span>
                  </div>

                  {/* Cells */}
                  {heatmap.lessons.map((lesson: any) => {
                    const result = lesson.studentResults.find(
                      (r: any) => r.studentId === student.id
                    )
                    const status = result?.status ?? 'not_started'
                    const percent = result?.percent ?? null
                    const isLate = result?.isLate ?? false

                    return (
                      <div
                        key={lesson.lessonId}
                        className={`w-16 h-10 flex-shrink-0 rounded flex items-center justify-center text-xs font-bold cursor-default transition ${cellColor(status, isLate)} hover:opacity-80`}
                        onMouseEnter={() =>
                          setHoveredCell({
                            lesson: lesson.lessonTitle,
                            student: student.firstName ?? student.username ?? '?',
                            percent,
                            isLate,
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${student.firstName}: ${lesson.lessonTitle} — ${percent !== null ? percent + '%' : 'не выполнено'}${isLate ? ' (просрочено)' : ''}`}
                      >
                        {cellText(percent, isLate)}
                      </div>
                    )
                  })}
                </div>
              ))}

              {heatmap.students.length === 0 && (
                <div className="text-gray-500 font-mono text-sm py-10 text-center">
                  Нет данных — никто ещё не сдавал домашние задания по этому курсу
                </div>
              )}
            </div>
          </div>

          {/* Problem lessons */}
          <div className="mt-8">
            <h3 className="text-lg font-bold uppercase tracking-widest mb-4">
              Проблемные уроки
            </h3>
            <div className="space-y-2">
              {heatmap.lessons
                .filter((l: any) => l.avgPercent !== null && l.avgPercent < 60)
                .sort((a: any, b: any) => (a.avgPercent ?? 100) - (b.avgPercent ?? 100))
                .map((lesson: any) => (
                  <div
                    key={lesson.lessonId}
                    className="flex items-center gap-4 bg-[#1a1a1a] border border-red-500/20 rounded-xl p-4"
                  >
                    <div className="text-2xl">⚠️</div>
                    <div className="flex-grow">
                      <div className="text-xs font-mono text-gray-500 mb-0.5">{lesson.taskTitle}</div>
                      <div className="font-medium">{lesson.lessonTitle}</div>
                    </div>
                    <div className="text-xl font-black text-red-400">
                      {lesson.avgPercent}%
                    </div>
                  </div>
                ))}
              {heatmap.lessons.filter((l: any) => l.avgPercent !== null && l.avgPercent < 60).length === 0 && (
                <p className="text-gray-500 font-mono text-sm">Проблемных уроков не обнаружено 🎉</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}