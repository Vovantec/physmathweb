'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const SUBJECTS = ['Физика', 'Математика (профиль)']

export default function AdminExamsPage() {
  const [variants, setVariants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Create form
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Физика')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [pdfUrl, setPdfUrl] = useState('')
  const [creating, setCreating] = useState(false)

  const load = () => {
    fetch('/api/admin/exams').then(r => r.json()).then(d => { setVariants(d); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    await fetch('/api/admin/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, subject, year, pdfUrl }),
    })
    setTitle(''); setPdfUrl('')
    setCreating(false)
    load()
  }

  const handleTogglePublish = async (id: number, current: boolean) => {
    await fetch(`/api/admin/exams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !current }),
    })
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить вариант со всеми заданиями и попытками?')) return
    await fetch(`/api/admin/exams/${id}`, { method: 'DELETE' })
    load()
  }

  const subjectColor = (s: string) =>
    s === 'Физика' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    : 'bg-purple-500/20 text-purple-400 border-purple-500/30'

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">Варианты ЕГЭ</h1>
        <div className="h-px bg-white/20 flex-grow" />
        <Link
          href="/admin/exam-tickets"
          className="bg-yellow-400 text-black font-bold uppercase tracking-widest text-xs px-5 py-2.5 rounded-lg hover:bg-yellow-300 transition"
        >
          Тикеты на проверку →
        </Link>
      </div>

      {/* Create form */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 mb-8 relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400 rounded-l-xl" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-5">Создать вариант</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Название варианта (напр: Вариант №1 — Физика 2024)"
            className="bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none col-span-full"
          />
          {/* Subject */}
          <div className="flex gap-2">
            {SUBJECTS.map(s => (
              <button key={s} onClick={() => setSubject(s)}
                className={`flex-1 py-2.5 rounded-lg border text-xs font-bold uppercase tracking-widest transition ${
                  subject === s ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                }`}>
                {s === 'Физика' ? '⚗️' : '📐'} {s}
              </button>
            ))}
          </div>
          {/* Year */}
          <input
            type="number" min="2020" max="2030"
            value={year} onChange={e => setYear(e.target.value)}
            placeholder="Год"
            className="bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none"
          />
          {/* PDF URL */}
          <input
            value={pdfUrl} onChange={e => setPdfUrl(e.target.value)}
            placeholder="URL PDF всего варианта (необязательно)"
            className="bg-black/40 border border-blue-500/20 rounded-lg p-3 text-white font-mono text-sm focus:border-blue-400 focus:outline-none col-span-full"
          />
        </div>
        <button
          onClick={handleCreate} disabled={!title.trim() || creating}
          className="bg-white text-black font-extrabold uppercase tracking-widest text-xs px-6 py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-40"
        >
          {creating ? '...' : '+ Создать вариант'}
        </button>
      </div>

      {/* Variants list */}
      {loading ? (
        <div className="text-white font-mono animate-pulse text-center py-20">Загрузка...</div>
      ) : variants.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-xl text-gray-500 font-mono">
          Вариантов пока нет
        </div>
      ) : (
        <div className="space-y-3">
          {variants.map((v: any) => (
            <div key={v.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 flex flex-col md:flex-row gap-4 md:items-center hover:border-white/20 transition">
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${subjectColor(v.subject)}`}>
                    {v.subject === 'Физика' ? '⚗️' : '📐'} {v.subject}
                  </span>
                  {v.year && <span className="text-xs font-mono text-gray-500">{v.year}</span>}
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                    v.isPublished
                      ? 'bg-green-500/20 border-green-500/30 text-green-400'
                      : 'bg-gray-500/20 border-gray-500/30 text-gray-400'
                  }`}>
                    {v.isPublished ? '✓ Опубликован' : 'Черновик'}
                  </span>
                </div>
                <h3 className="font-bold text-white text-lg">{v.title}</h3>
                <p className="text-xs font-mono text-gray-500 mt-1">
                  {v._count.tasks} заданий · {v._count.attempts} попыток
                  {v.pdfUrl && <span className="ml-3 text-blue-400">📄 PDF</span>}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                <button
                  onClick={() => handleTogglePublish(v.id, v.isPublished)}
                  className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg border transition ${
                    v.isPublished
                      ? 'bg-gray-500/20 border-gray-500/30 text-gray-400 hover:bg-gray-500/30'
                      : 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {v.isPublished ? 'Снять с публ.' : 'Опубликовать'}
                </button>
                <Link
                  href={`/admin/exams/${v.id}`}
                  className="text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white hover:text-black text-white px-4 py-2 rounded-lg border border-white/20 transition"
                >
                  Редактировать →
                </Link>
                <button
                  onClick={() => handleDelete(v.id)}
                  className="text-xs font-bold uppercase tracking-widest bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-2 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}