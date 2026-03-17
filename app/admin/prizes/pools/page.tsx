// app/admin/prizes/pools/page.tsx
// Путь: app/admin/prizes/pools/page.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import FileManagerModal from '@/app/components/admin/FileManagerModal'

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function AdminPrizePoolsPage() {
  const [pools, setPools]   = useState<any[]>([])
  const [prizes, setPrizes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Create form
  const [name, setName]               = useState('')
  const [ratingType, setRatingType]   = useState<'points' | 'referrals'>('points')
  const [startDate, setStartDate]     = useState('')
  const [endDate, setEndDate]         = useState('')
  const [placesCount, setPlacesCount] = useState(3)
  const [placements, setPlacements]   = useState<{ place: number; prizeId: number }[]>([])
  const [creating, setCreating]       = useState(false)

  // Award modal
  const [awardModal, setAwardModal]   = useState<any>(null)  // { awardId, winnerName, place }
  const [awardPhoto, setAwardPhoto]   = useState('')
  const [awardComment, setAwardComment] = useState('')
  const [awarding, setAwarding]       = useState(false)
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/prizes/pools').then(r => r.json()),
      fetch('/api/admin/prizes').then(r => r.json()),
    ]).then(([p, pr]) => { setPools(p); setPrizes(pr); setLoading(false) })
  }, [])

  // Sync placement slots when placesCount changes
  useEffect(() => {
    setPlacements(prev => {
      const next = [...prev]
      while (next.length < placesCount) next.push({ place: next.length + 1, prizeId: 0 })
      return next.slice(0, placesCount)
    })
  }, [placesCount])

  const handleCreate = async () => {
    if (!name || !startDate || !endDate) return
    if (placements.some(p => !p.prizeId)) return alert('Выберите приз для каждого места')
    setCreating(true)

    await fetch('/api/admin/prizes/pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ratingType, startDate, endDate, placesCount, placements }),
    })

    setName(''); setStartDate(''); setEndDate(''); setPlacesCount(3); setPlacements([])
    setCreating(false)
    fetch('/api/admin/prizes/pools').then(r => r.json()).then(setPools)
  }

  const handleDeletePool = async (id: string) => {
    if (!confirm('Удалить розыгрыш?')) return
    await fetch(`/api/admin/prizes/pools?id=${id}`, { method: 'DELETE' })
    setPools(prev => prev.filter(p => p.id !== id))
  }

  const handleAward = async () => {
    if (!awardModal) return
    setAwarding(true)
    await fetch('/api/admin/prizes/award', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ awardId: awardModal.awardId, photoUrl: awardPhoto || null, comment: awardComment || null }),
    })
    setAwarding(false)
    setAwardModal(null)
    setAwardPhoto('')
    setAwardComment('')
    fetch('/api/admin/prizes/pools').then(r => r.json()).then(setPools)
  }

  if (loading) {
    return <div className="text-white font-mono animate-pulse text-center py-20">Загрузка...</div>
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/prizes" className="text-xs font-mono text-gray-500 hover:text-white transition uppercase tracking-widest border-b border-transparent hover:border-white pb-0.5">
          ← Каталог призов
        </Link>
        <div className="h-px bg-white/20 flex-grow" />
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">Розыгрыши</h1>
      </div>

      {/* Create form */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 mb-10 relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400 rounded-l-xl" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-5">Создать розыгрыш</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Название (например: Топ декабря)"
            className="bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none col-span-full" />

          {/* Rating type toggle */}
          <div className="flex gap-2">
            {(['points', 'referrals'] as const).map(rt => (
              <button key={rt} onClick={() => setRatingType(rt)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-bold uppercase tracking-widest transition ${
                  ratingType === rt ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                }`}>
                {rt === 'points' ? '💎 Баллы' : '🌟 Рефералы'}
              </button>
            ))}
          </div>

          {/* Places count */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest whitespace-nowrap">Призовых мест:</span>
            <input type="number" min={1} max={10} value={placesCount}
              onChange={e => setPlacesCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              className="w-20 bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none text-center" />
          </div>

          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none" />
        </div>

        {/* Prize placements */}
        <div className="space-y-3 mb-5">
          {Array.from({ length: placesCount }, (_, i) => i + 1).map(place => (
            <div key={place} className="flex items-center gap-3">
              <span className="text-lg w-8 text-center flex-shrink-0">{MEDALS[place] ?? `#${place}`}</span>
              <select
                value={placements.find(p => p.place === place)?.prizeId ?? 0}
                onChange={e => {
                  const prizeId = parseInt(e.target.value)
                  setPlacements(prev => {
                    const next = [...prev]
                    const idx  = next.findIndex(p => p.place === place)
                    if (idx >= 0) next[idx] = { place, prizeId }
                    else next.push({ place, prizeId })
                    return next
                  })
                }}
                className="flex-grow bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none"
              >
                <option value={0}>Выберите приз...</option>
                {prizes.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <button onClick={handleCreate} disabled={creating || !name || !startDate || !endDate}
          className="bg-white text-black font-extrabold uppercase tracking-widest text-xs px-6 py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-40">
          {creating ? '...' : '+ Создать розыгрыш'}
        </button>
      </div>

      {/* Pools list */}
      <div className="space-y-6">
        {pools.length === 0 && (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl text-gray-500 font-mono">
            Розыгрышей пока нет
          </div>
        )}

        {pools.map((pool: any) => (
          <div key={pool.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
            {/* Pool header */}
            <div className="flex items-center gap-4 p-5 border-b border-white/5">
              <div className="flex-grow">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-bold text-lg text-white">{pool.name}</h3>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                    pool.isFinished
                      ? 'bg-gray-500/20 border-gray-500/30 text-gray-400'
                      : 'bg-green-500/20 border-green-500/30 text-green-400'
                  }`}>
                    {pool.isFinished ? 'Завершён' : 'Активен'}
                  </span>
                  <span className="text-xs font-mono text-gray-500">
                    {pool.ratingType === 'points' ? '💎 Баллы' : '🌟 Рефералы'}
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-500 mt-1">
                  {new Date(pool.startDate).toLocaleDateString('ru-RU')} —{' '}
                  {new Date(pool.endDate).toLocaleDateString('ru-RU')}
                </div>
              </div>
              {!pool.isFinished && (
                <button onClick={() => handleDeletePool(pool.id)}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded transition font-mono">
                  Удалить
                </button>
              )}
            </div>

            {/* Winners */}
            <div className="p-5 space-y-3">
              {pool.placements.map((placement: any) => {
                const award = pool.awards.find((a: any) => a.place === placement.place)
                const isAwarded = award?.status === 'awarded'
                return (
                  <div key={placement.place} className={`flex items-center gap-4 rounded-xl p-4 border ${
                    isAwarded
                      ? 'bg-green-500/10 border-green-500/20'
                      : award
                      ? 'bg-yellow-400/10 border-yellow-400/20'
                      : 'bg-white/5 border-white/5'
                  }`}>
                    <span className="text-2xl flex-shrink-0">{MEDALS[placement.place] ?? `#${placement.place}`}</span>

                    {/* Winner info */}
                    {award?.winner ? (
                      <div className="flex items-center gap-3 flex-grow min-w-0">
                        <img
                          src={award.winner.photoUrl ?? `https://ui-avatars.com/api/?name=${award.winner.firstName ?? 'W'}&background=random`}
                          alt="" className="w-9 h-9 rounded-full border border-white/10 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate">
                            {award.winner.firstName ?? award.winner.username ?? '?'}
                          </div>
                          <div className="text-xs font-mono text-gray-500 truncate">{placement.prize.title}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-grow text-gray-500 font-mono text-sm">
                        {pool.isFinished ? 'Победитель не определён' : 'Розыгрыш ещё не завершён'}
                        <div className="text-xs mt-0.5">{placement.prize.title}</div>
                      </div>
                    )}

                    {/* Status + action */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {isAwarded ? (
                        <span className="text-xs font-bold text-green-400 bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded-lg">
                          🎁 Выдан
                        </span>
                      ) : award ? (
                        <button
                          onClick={() => setAwardModal({ awardId: award.id, winnerName: award.winner?.firstName ?? '?', place: placement.place, prizeName: placement.prize.title })}
                          className="text-xs font-bold uppercase tracking-widest bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/30 text-yellow-400 px-4 py-2 rounded-lg transition"
                        >
                          Вручить приз
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Award modal */}
      {awardModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setAwardModal(null)}>
          <div className="bg-[#1a1a1a] border border-white/20 rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-1">Вручение приза</h3>
            <p className="text-gray-400 text-sm font-mono mb-5">
              {MEDALS[awardModal.place] ?? `#${awardModal.place}`} {awardModal.winnerName} — {awardModal.prizeName}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">Фото с вручения (URL)</label>
                <div className="flex gap-2">
                  <input value={awardPhoto} onChange={e => setAwardPhoto(e.target.value)}
                    placeholder="https://..."
                    className="flex-grow bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none" />
                  <button onClick={() => setIsFileManagerOpen(true)}
                    className="bg-white/10 px-3 rounded-lg border border-white/20 hover:bg-yellow-400 hover:text-black transition">
                    📁
                  </button>
                </div>
                {awardPhoto && (
                  <img src={awardPhoto} alt="preview"
                    className="mt-2 max-h-32 rounded-lg border border-white/10 object-contain"
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">Комментарий</label>
                <textarea value={awardComment} onChange={e => setAwardComment(e.target.value)}
                  placeholder="Необязательно..."
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleAward} disabled={awarding}
                  className="flex-grow bg-green-600 hover:bg-green-500 text-white font-extrabold uppercase tracking-widest text-sm py-3 rounded-xl transition disabled:opacity-40">
                  {awarding ? '...' : '✅ Отметить как выданный'}
                </button>
                <button onClick={() => setAwardModal(null)}
                  className="border border-white/20 text-gray-400 hover:text-white px-5 py-3 rounded-xl transition font-bold uppercase tracking-widest text-sm">
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FileManagerModal
        isOpen={isFileManagerOpen}
        onClose={() => setIsFileManagerOpen(false)}
        onSelect={path => { setAwardPhoto(path); setIsFileManagerOpen(false) }}
        baseFolder="images"
      />
    </div>
  )
}