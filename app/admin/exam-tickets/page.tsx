'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Ожидает проверки', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  reviewing: { label: 'Проверяется',      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  revision:  { label: 'На доработке',     color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  closed:    { label: 'Закрыт',           color: 'text-green-400 bg-green-500/10 border-green-500/20' },
}

export default function AdminExamTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('open')

  const load = (status: string) => {
    setLoading(true)
    const params = status === 'open' ? '' : `?status=${status}`
    fetch(`/api/admin/exam-tickets${params}`)
      .then(r => r.json())
      .then(d => { setTickets(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load(statusFilter) }, [statusFilter])

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">Тикеты ЕГЭ</h1>
        <div className="h-px bg-white/20 flex-grow" />
        <Link href="/admin/exams" className="text-xs font-mono text-gray-500 hover:text-white transition uppercase tracking-widest border-b border-transparent hover:border-white pb-0.5">
          ← Варианты
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'open', label: 'Активные' },
          { key: 'submitted', label: 'Ожидают' },
          { key: 'reviewing', label: 'В работе' },
          { key: 'revision', label: 'На доработке' },
          { key: 'closed', label: 'Закрытые' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`px-4 py-2 rounded-lg border text-sm font-bold transition ${
              statusFilter === key ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-white font-mono animate-pulse text-center py-20">Загрузка...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-xl text-gray-500 font-mono">
          Тикетов нет
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t: any) => {
            const statusInfo = STATUS_LABELS[t.status]
            return (
              <div key={t.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 flex flex-col md:flex-row gap-4 md:items-center hover:border-white/20 transition">
                {/* Student */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <img
                    src={t.student.photoUrl ?? `https://ui-avatars.com/api/?name=${t.student.firstName ?? 'S'}&background=random`}
                    alt="" className="w-10 h-10 rounded-full border border-white/10"
                  />
                  <div>
                    <div className="font-bold text-sm text-white">{t.student.firstName ?? t.student.username ?? '?'}</div>
                    {t.student.username && <div className="text-xs text-gray-500 font-mono">@{t.student.username}</div>}
                  </div>
                </div>

                {/* Variant info */}
                <div className="flex-grow min-w-0">
                  <div className="font-medium text-white truncate">{t.variant.title}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                      t.variant.subject === 'Физика' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                    }`}>
                      {t.variant.subject}
                    </span>
                    {statusInfo && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    )}
                    {t.submittedAt && (
                      <span className="text-xs font-mono text-gray-500">
                        {new Date(t.submittedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score summary */}
                {t.totalScore != null && (
                  <div className="flex-shrink-0 text-right">
                    <span className="text-lg font-black text-yellow-400">{t.totalScore}</span>
                    <span className="text-xs font-mono text-gray-500 block">баллов</span>
                  </div>
                )}

                <Link
                  href={`/admin/exam-tickets/${t.id}`}
                  className="flex-shrink-0 text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white hover:text-black text-white border border-white/20 px-5 py-2.5 rounded-lg transition"
                >
                  Проверить →
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}