'use client'
import { useState, useEffect } from 'react'

export default function AdminParentAccessPage() {
  const [students, setStudents] = useState<any[]>([])
  const [accesses, setAccesses] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [label, setLabel] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/students').then(r => r.json()).then(setStudents)
    loadAccesses()
  }, [])

  const loadAccesses = () => {
    fetch('/api/admin/parent-access').then(r => r.json()).then(setAccesses)
  }

  const handleCreate = async () => {
    if (!selectedStudent) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/parent-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          label: label || null,
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : null,
        }),
      })
      if (res.ok) {
        setSelectedStudent('')
        setLabel('')
        setExpiresInDays('')
        loadAccesses()
      }
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить ссылку?')) return
    await fetch(`/api/admin/parent-access?id=${id}`, { method: 'DELETE' })
    loadAccesses()
  }

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">
          Доступ для родителей
        </h1>
        <div className="h-px bg-white/20 flex-grow" />
      </div>

      {/* Create form */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">
          Создать ссылку для родителя
        </h2>

        <div className="flex flex-col md:flex-row gap-3">
          <select
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
            className="flex-grow bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none transition"
          >
            <option value="">Выберите ученика...</option>
            {students.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.firstName ?? s.username ?? `ID: ${s.id}`}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Подпись (например: Мама Ивана)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="flex-grow bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none transition"
          />

          <input
            type="number"
            placeholder="Дней действия (пусто = бессрочно)"
            value={expiresInDays}
            onChange={e => setExpiresInDays(e.target.value)}
            className="w-48 bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none transition"
          />

          <button
            onClick={handleCreate}
            disabled={!selectedStudent || creating}
            className="bg-white text-black font-extrabold uppercase tracking-widest px-6 py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50 whitespace-nowrap"
          >
            {creating ? '...' : 'Создать ссылку'}
          </button>
        </div>
      </div>

      {/* Accesses list */}
      <div className="space-y-3">
        {accesses.length === 0 && (
          <p className="text-gray-500 font-mono text-sm text-center py-10 border border-dashed border-white/10 rounded-xl">
            Ссылок для родителей пока нет
          </p>
        )}

        {accesses.map((access: any) => (
          <div
            key={access.id}
            className={`bg-[#1a1a1a] border rounded-xl p-5 flex flex-col md:flex-row gap-4 md:items-center ${
              access.isExpired ? 'border-red-500/20 opacity-50' : 'border-white/10'
            }`}
          >
            {/* Student info */}
            <div className="flex items-center gap-3 flex-grow min-w-0">
              <img
                src={
                  access.student.photoUrl ??
                  `https://ui-avatars.com/api/?name=${access.student.firstName ?? 'S'}&background=random`
                }
                alt=""
                className="w-10 h-10 rounded-full border border-white/10 flex-shrink-0"
              />
              <div>
                <div className="font-bold text-sm">
                  {access.student.firstName ?? access.student.username ?? '?'}
                </div>
                {access.label && (
                  <div className="text-xs text-gray-500 font-mono">{access.label}</div>
                )}
              </div>
            </div>

            {/* URL */}
            <div className="flex-grow min-w-0">
              <div className="text-xs font-mono text-gray-500 truncate">{access.url}</div>
              {access.expiresAt && (
                <div className={`text-xs font-mono mt-0.5 ${access.isExpired ? 'text-red-400' : 'text-gray-500'}`}>
                  {access.isExpired ? '⛔ Истекла' : `до ${new Date(access.expiresAt).toLocaleDateString('ru-RU')}`}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleCopy(access.url, access.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${
                  copiedId === access.id
                    ? 'bg-green-500 text-black'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {copiedId === access.id ? '✓ Скопировано' : 'Копировать'}
              </button>
              <button
                onClick={() => handleDelete(access.id)}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}