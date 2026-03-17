// app/admin/heatmap/page.tsx
// Путь: app/admin/heatmap/page.tsx
'use client'
import { useState, useEffect } from 'react'

function cellColor(status: string, isLate: boolean) {
  if (status === 'not_started') return 'bg-white/5 text-gray-600'
  if (status === 'perfect')     return isLate ? 'bg-blue-500/40 text-blue-200'   : 'bg-green-500/50 text-green-100'
  if (status === 'partial')     return isLate ? 'bg-orange-500/40 text-orange-200' : 'bg-yellow-400/30 text-yellow-100'
  return 'bg-red-500/30 text-red-200'
}

export default function AdminHeatmapPage() {
  const [courses, setCourses]             = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)
  const [heatmap, setHeatmap]             = useState<any>(null)
  const [loading, setLoading]             = useState(false)
  const [exporting, setExporting]         = useState(false)

  // filters
  const [fromDate, setFromDate]           = useState('')
  const [toDate, setToDate]               = useState('')

  // checkboxes
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set())
  const [allSelected, setAllSelected]     = useState(true)

  useEffect(() => {
    fetch('/api/courses').then(r => r.json()).then(setCourses)
  }, [])

  const loadHeatmap = async (courseId: number) => {
    setSelectedCourse(courseId)
    setLoading(true)
    setSelectedStudents(new Set())
    setAllSelected(true)

    const params = new URLSearchParams({ courseId: String(courseId) })
    if (fromDate) params.set('from', fromDate)
    if (toDate)   params.set('to',   toDate)

    const res  = await fetch(`/api/admin/heatmap?${params}`)
    const data = await res.json()
    setHeatmap(data)
    setLoading(false)
  }

  const toggleStudent = (id: number) => {
    setSelectedStudents(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      setAllSelected(next.size === heatmap?.students?.length)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelectedStudents(new Set())
      setAllSelected(false)
    } else {
      setSelectedStudents(new Set(heatmap?.students?.map((s: any) => s.id) ?? []))
      setAllSelected(true)
    }
  }

  const handleExport = async () => {
    if (!selectedCourse) return
    setExporting(true)

    const body: any = { courseId: selectedCourse }
    if (fromDate) body.from = fromDate
    if (toDate)   body.to   = toDate
    if (!allSelected && selectedStudents.size > 0) {
      body.studentIds = Array.from(selectedStudents)
    }

    const res = await fetch('/api/admin/heatmap/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `heatmap_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    }
    setExporting(false)
  }

  const visibleStudents = heatmap?.students?.filter((s: any) =>
    allSelected || selectedStudents.has(s.id)
  ) ?? []

  const avgColor = (avg: number | null) =>
    avg === null ? 'text-gray-600' : avg >= 80 ? 'text-green-400' : avg >= 50 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">Тепловая карта знаний</h1>
        <div className="h-px bg-white/20 flex-grow" />
      </div>

      {/* Controls */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 mb-6 flex flex-col md:flex-row gap-4 flex-wrap">
        {/* Course */}
        <div className="flex-grow min-w-[180px]">
          <label className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">Курс</label>
          <select
            value={selectedCourse ?? ''}
            onChange={e => e.target.value && loadHeatmap(parseInt(e.target.value))}
            className="w-full bg-black/40 border border-white/10 rounded p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none"
          >
            <option value="">Выберите курс...</option>
            {courses.map((c: any) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div>
          <label className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">С даты</label>
          <input
            type="date" value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="bg-black/40 border border-white/10 rounded p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none"
          />
        </div>

        {/* Date to */}
        <div>
          <label className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">По дату</label>
          <input
            type="date" value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="bg-black/40 border border-white/10 rounded p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none"
          />
        </div>

        {/* Apply + Export */}
        <div className="flex items-end gap-3">
          {selectedCourse && (
            <button
              onClick={() => loadHeatmap(selectedCourse)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold uppercase tracking-widest text-xs px-5 py-3 rounded-lg transition"
            >
              Применить
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={!heatmap || exporting}
            className="bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-widest text-xs px-5 py-3 rounded-lg transition disabled:opacity-40 flex items-center gap-2"
          >
            {exporting ? '⏳ Экспорт...' : '⬇ Excel'}
            {!allSelected && selectedStudents.size > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">
                {selectedStudents.size} чел.
              </span>
            )}
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-white font-mono animate-pulse text-center py-20">Загрузка...</div>
      )}

      {heatmap && !loading && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Учеников',  value: heatmap.students.length },
              { label: 'Уроков',    value: heatmap.lessons.length  },
              { label: 'Средний %', value: heatmap.lessons.filter((l: any) => l.avgPercent !== null).length > 0
                ? Math.round(heatmap.lessons.filter((l: any) => l.avgPercent !== null)
                    .reduce((s: number, l: any) => s + l.avgPercent, 0) /
                    heatmap.lessons.filter((l: any) => l.avgPercent !== null).length) + '%'
                : '—'
              },
            ].map(stat => (
              <div key={stat.label} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-1">{stat.label}</span>
                <span className="text-2xl font-black text-white">{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-5 text-xs font-mono">
            {[
              { color: 'bg-green-500/50',   label: '100% в срок'     },
              { color: 'bg-blue-500/40',    label: '100% с опозданием' },
              { color: 'bg-yellow-400/30',  label: '50–99% в срок'   },
              { color: 'bg-orange-500/40',  label: '50–99% с опозданием' },
              { color: 'bg-red-500/30',     label: '<50%'             },
              { color: 'bg-white/5',        label: 'Не выполнено'     },
            ].map(i => (
              <span key={i.label} className="flex items-center gap-1.5 text-gray-400">
                <span className={`w-3 h-3 rounded border border-white/10 ${i.color}`} />
                {i.label}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="overflow-x-auto pb-4">
            <div className="min-w-max">
              {/* Header */}
              <div className="flex gap-px mb-px items-end">
                {/* Checkbox all */}
                <div className="w-8 flex-shrink-0 flex justify-center pb-2">
                  <input
                    type="checkbox" checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-yellow-400 cursor-pointer"
                  />
                </div>
                <div className="w-44 flex-shrink-0" />
                {heatmap.lessons.map((lesson: any) => (
                  <div key={lesson.lessonId} className="w-16 flex-shrink-0 text-center pb-1">
                    <div className="text-[9px] font-mono text-gray-500 truncate px-0.5 leading-tight">
                      {lesson.lessonTitle.slice(0, 10)}
                    </div>
                    <div className={`text-xs font-bold ${avgColor(lesson.avgPercent)}`}>
                      {lesson.avgPercent !== null ? `${lesson.avgPercent}%` : '—'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Student rows */}
              {heatmap.students.map((student: any) => {
                const isChecked = allSelected || selectedStudents.has(student.id)
                return (
                  <div key={student.id} className={`flex gap-px mb-px items-center transition ${!isChecked ? 'opacity-30' : ''}`}>
                    {/* Checkbox */}
                    <div className="w-8 flex-shrink-0 flex justify-center">
                      <input
                        type="checkbox" checked={isChecked}
                        onChange={() => toggleStudent(student.id)}
                        className="w-4 h-4 accent-yellow-400 cursor-pointer"
                      />
                    </div>
                    {/* Name */}
                    <div className="w-44 flex-shrink-0 flex items-center gap-2 pr-2">
                      <img
                        src={student.photoUrl ?? `https://ui-avatars.com/api/?name=${student.firstName ?? 'S'}&background=random&size=28`}
                        alt="" className="w-7 h-7 rounded-full border border-white/10 flex-shrink-0"
                      />
                      <span className="text-xs font-mono text-gray-300 truncate">
                        {student.firstName ?? student.username ?? '?'}
                      </span>
                    </div>
                    {/* Cells */}
                    {heatmap.lessons.map((lesson: any) => {
                      const result = lesson.studentResults.find((r: any) => r.studentId === student.id)
                      const status  = result?.status  ?? 'not_started'
                      const percent = result?.percent ?? null
                      const isLate  = result?.isLate  ?? false
                      return (
                        <div
                          key={lesson.lessonId}
                          className={`w-16 h-9 flex-shrink-0 rounded flex items-center justify-center text-xs font-bold ${cellColor(status, isLate)}`}
                          title={`${student.firstName}: ${lesson.lessonTitle} — ${percent !== null ? percent + '%' : '—'}${isLate ? ' (просрочено)' : ''}`}
                        >
                          {percent !== null ? `${percent}%${isLate ? '⏰' : ''}` : '—'}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Problem lessons */}
          {heatmap.lessons.some((l: any) => l.avgPercent !== null && l.avgPercent < 60) && (
            <div className="mt-8">
              <h3 className="text-lg font-bold uppercase tracking-widest mb-4">⚠️ Проблемные уроки</h3>
              <div className="space-y-2">
                {heatmap.lessons
                  .filter((l: any) => l.avgPercent !== null && l.avgPercent < 60)
                  .sort((a: any, b: any) => a.avgPercent - b.avgPercent)
                  .map((l: any) => (
                    <div key={l.lessonId} className="flex items-center gap-4 bg-[#1a1a1a] border border-red-500/20 rounded-xl p-4">
                      <div className="flex-grow">
                        <div className="text-xs font-mono text-gray-500">{l.taskTitle}</div>
                        <div className="font-medium">{l.lessonTitle}</div>
                      </div>
                      <div className="text-xl font-black text-red-400">{l.avgPercent}%</div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}