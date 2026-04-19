'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import SiteHeader from '../components/SiteHeader'
import { useAuth } from '../hooks/useAuth'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Черновик',    color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' },
  submitted: { label: 'На проверке', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  reviewing: { label: 'Проверяется', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  revision:  { label: 'На доработке', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  closed:    { label: 'Проверено',   color: 'text-green-400 bg-green-500/10 border-green-500/20' },
}

export default function ExamsPage() {
  const { user, loading } = useAuth()
  const [variants, setVariants] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState<string>('all')

  useEffect(() => {
    if (!user) return
    setDataLoading(true)
    fetch(`/api/exams?userId=${user.id}`)
      .then(r => r.json())
      .then(d => { setVariants(Array.isArray(d) ? d : []); setDataLoading(false) })
      .catch(() => setDataLoading(false))
  }, [user])

  const filtered = subjectFilter === 'all' ? variants : variants.filter(v => v.subject === subjectFilter)
  const subjects = [...new Set(variants.map((v: any) => v.subject))]

  return (
    <div className="min-h-screen flex flex-col items-center p-8 bg-[#121212] text-white">
      <SiteHeader />

      <main className="w-full max-w-5xl flex-grow">
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight">Варианты ЕГЭ</h1>
          <div className="h-px bg-white/20 flex-grow" />
        </div>

        {!loading && !user ? (
          <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-xl">
            <p className="text-gray-400 font-mono">Войдите для доступа к вариантам ЕГЭ</p>
          </div>
        ) : (
          <>
            {/* Subject filter */}
            {subjects.length > 1 && (
              <div className="flex gap-2 mb-6 flex-wrap">
                <button onClick={() => setSubjectFilter('all')}
                  className={`px-5 py-2.5 rounded-lg border text-sm font-bold transition ${
                    subjectFilter === 'all' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'
                  }`}>
                  Все предметы
                </button>
                {subjects.map(s => (
                  <button key={s} onClick={() => setSubjectFilter(s)}
                    className={`px-5 py-2.5 rounded-lg border text-sm font-bold transition ${
                      subjectFilter === s ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'
                    }`}>
                    {s === 'Физика' ? '⚗️' : '📐'} {s}
                  </button>
                ))}
              </div>
            )}

            {dataLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/10 rounded-xl text-gray-500 font-mono">
                Вариантов пока нет
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((v: any) => {
                  const status = v.attempt?.status
                  const statusInfo = status ? STATUS_LABELS[status] : null

                  return (
                    <div key={v.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 flex flex-col md:flex-row gap-4 md:items-center hover:border-white/30 transition group">
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                            v.subject === 'Физика'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          }`}>
                            {v.subject === 'Физика' ? '⚗️' : '📐'} {v.subject}
                          </span>
                          {v.year && <span className="text-xs font-mono text-gray-500">{v.year}</span>}
                          {statusInfo && (
                            <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-xl text-white group-hover:text-yellow-400 transition">{v.title}</h3>
                        <p className="text-xs font-mono text-gray-500 mt-1">
                          {v._count.tasks} заданий
                          {v.attempt?.totalScore != null && ` · Итог: ${v.attempt.totalScore} балл`}
                          {v.attempt?.part1Score != null && ` (Ч1: ${v.attempt.part1Score}`}
                          {v.attempt?.part2Score != null && `, Ч2: ${v.attempt.part2Score})`}
                          {v.pdfUrl && <span className="ml-3 text-blue-400">📄 PDF варианта</span>}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {v.pdfUrl && (
                          <a href={v.pdfUrl} target="_blank" rel="noreferrer" download
                            className="text-xs font-bold uppercase tracking-widest bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg transition">
                            📄 PDF
                          </a>
                        )}
                        <Link
                          href={`/exams/${v.id}`}
                          className="text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white hover:text-black text-white border border-white/20 px-5 py-2 rounded-lg transition"
                        >
                          {status === 'closed' ? 'Результат' : status ? 'Продолжить' : 'Решать →'}
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}