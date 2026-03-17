// app/leaderboard/page.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import SiteHeader from '../components/SiteHeader'
import { useAuth } from '../hooks/useAuth'

interface LeaderEntry {
  rank:           number
  telegramId:     string
  firstName:      string
  username:       string | null
  photoUrl:       string | null
  score:          number
  homeworkDone?:  number
  referralPoints?: number
  prize?:         string | null
}

interface PrizeResult {
  place:    number
  status:   string
  photoUrl: string | null
  prize:    { title: string; imageUrl: string | null } | null
  winner:   { telegramId: string; firstName: string | null; username: string | null; photoUrl: string | null } | null
}

interface PrizePool {
  id:         string
  name:       string
  ratingType: string
  startDate:  string
  endDate:    string
  results:    PrizeResult[]
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [tab, setTab]           = useState<'points' | 'referrals'>('points')
  const [period, setPeriod]     = useState<'all' | 'month'>('all')
  const [data, setData]         = useState<LeaderEntry[]>([])
  const [pools, setPools]       = useState<PrizePool[]>([])
  const [loading, setLoading]   = useState(true)

  const myTgId = user?.id?.toString() ?? null

  useEffect(() => {
    fetch('/api/prizes').then(r => r.json()).then(setPools).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ type: tab, period, limit: '20' })
    fetch(`/api/leaderboard?${params}`)
      .then(r => r.json())
      .then(d => { setData(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tab, period])

  const myRank = myTgId ? data.findIndex(e => e.telegramId === myTgId) + 1 : 0

  return (
    <div className="min-h-screen flex flex-col items-center p-8 bg-[#121212] text-white">
      <SiteHeader activePage="leaderboard" />

      <main className="w-full max-w-4xl flex-grow flex flex-col">

        {/* Tabs + period + my rank */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {(['points', 'referrals'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-widest transition ${
                tab === t
                  ? t === 'points' ? 'bg-white text-black' : 'bg-yellow-400 text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}>
              {t === 'points' ? '🏆 Успеваемость' : '🌟 Амбассадоры'}
            </button>
          ))}

          {tab === 'points' && (
            <div className="flex gap-2 ml-1">
              {(['all', 'month'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 rounded text-xs font-mono uppercase tracking-widest transition ${
                    period === p ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}>
                  {p === 'all' ? 'Всё время' : 'Этот месяц'}
                </button>
              ))}
            </div>
          )}

          {myRank > 0 && (
            <div className="ml-auto bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-5 py-2 flex items-center gap-2">
              <span className="text-xs font-mono text-yellow-400/70 uppercase tracking-widest">Ваша позиция</span>
              <span className="text-xl font-black text-yellow-400">#{myRank}</span>
            </div>
          )}
        </div>

        <div className="space-y-8">

          {/* Rankings list */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="bg-[#1a1a1a] border-2 border-dashed border-white/10 rounded-xl p-10 text-center text-gray-400 font-mono">
              Данных пока нет.
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((entry, idx) => {
                const isMe  = entry.telegramId === myTgId
                const isTop = idx < 3

                const wonPrize = pools.flatMap(p => p.results).find(
                  r => r.winner?.telegramId === entry.telegramId && r.status === 'awarded'
                )

                return (
                  <div key={entry.telegramId}
                    className={`flex items-center gap-4 p-5 rounded-xl border transition ${
                      isMe  ? 'bg-yellow-400/10 border-yellow-400/40'
                      : isTop ? 'bg-[#1a1a1a] border-white/20'
                      : 'bg-[#1a1a1a] border-white/5 hover:border-white/15'
                    }`}>

                    <div className="w-10 text-center flex-shrink-0">
                      {MEDALS[entry.rank]
                        ? <span className="text-2xl">{MEDALS[entry.rank]}</span>
                        : <span className="text-lg font-black text-gray-500">#{entry.rank}</span>
                      }
                    </div>

                    <img
                      src={entry.photoUrl ?? `https://ui-avatars.com/api/?name=${entry.firstName}&background=random`}
                      alt="avatar"
                      className={`w-12 h-12 rounded-full border-2 flex-shrink-0 ${isTop ? 'border-yellow-400/50' : 'border-white/10'}`}
                    />

                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-lg truncate ${isMe ? 'text-yellow-400' : 'text-white'}`}>
                          {entry.firstName}
                        </span>
                        {isMe && (
                          <span className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded font-mono uppercase tracking-widest">
                            Вы
                          </span>
                        )}
                        {wonPrize && (
                          <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded font-bold">
                            🎁 Приз получен
                          </span>
                        )}
                      </div>
                      {entry.username && (
                        <span className="text-xs text-gray-500 font-mono">@{entry.username}</span>
                      )}
                      {entry.prize && (
                        <div className="mt-1 text-xs text-yellow-300 bg-yellow-400/10 border border-yellow-400/20 rounded px-2 py-0.5 inline-block">
                          🎁 {entry.prize}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-right">
                      {tab === 'points' ? (
                        <div>
                          <span className="text-2xl font-black text-white">{entry.score}</span>
                          <span className="text-yellow-400 ml-1">💎</span>
                          {entry.homeworkDone !== undefined && (
                            <div className="text-xs text-gray-500 font-mono mt-0.5">{entry.homeworkDone} ДЗ</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="text-2xl font-black text-white">{entry.score}</span>
                          <span className="text-sm text-gray-400 ml-1">чел.</span>
                          {entry.referralPoints !== undefined && entry.referralPoints > 0 && (
                            <div className="text-xs text-yellow-400 font-mono mt-0.5">
                              +{entry.referralPoints} 💎
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Finished prize pools */}
          {pools.length > 0 && (
            <div>
              <div className="flex items-center gap-4 mb-5">
                <h2 className="text-xl font-bold uppercase tracking-widest">Завершённые розыгрыши</h2>
                <div className="h-px bg-white/10 flex-grow" />
              </div>

              <div className="space-y-6">
                {pools.map(pool => (
                  <div key={pool.id} className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{pool.name}</h3>
                        <span className="text-xs font-mono text-gray-500">
                          {pool.ratingType === 'points' ? '💎 По баллам' : '🌟 По рефералам'} ·{' '}
                          {new Date(pool.startDate).toLocaleDateString('ru-RU')} —{' '}
                          {new Date(pool.endDate).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <span className="text-xs font-mono bg-gray-500/20 text-gray-400 border border-gray-500/30 px-3 py-1 rounded">
                        Завершён
                      </span>
                    </div>

                    <div className="p-6 space-y-3">
                      {pool.results.map(result => (
                        <div key={result.place}
                          className={`flex items-center gap-4 p-4 rounded-xl border ${
                            result.status === 'awarded'
                              ? 'bg-green-500/10 border-green-500/20'
                              : 'bg-white/5 border-white/5'
                          }`}>

                          <span className="text-2xl flex-shrink-0">
                            {MEDALS[result.place] ?? `#${result.place}`}
                          </span>

                          {result.winner ? (
                            <>
                              <img
                                src={result.winner.photoUrl ?? `https://ui-avatars.com/api/?name=${result.winner.firstName ?? 'W'}&background=random`}
                                alt="" className="w-10 h-10 rounded-full border border-white/10 flex-shrink-0"
                              />
                              <div className="flex-grow min-w-0">
                                <div className="font-bold text-sm">
                                  {result.winner.firstName ?? result.winner.username ?? '?'}
                                </div>
                                {result.prize && (
                                  <div className="text-xs text-gray-400 font-mono">{result.prize.title}</div>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="flex-grow text-gray-500 font-mono text-sm">
                              Победитель не определён
                            </div>
                          )}

                          <div className="flex items-center gap-3 flex-shrink-0">
                            {result.photoUrl && (
                              <img src={result.photoUrl} alt="вручение"
                                className="w-12 h-12 rounded-lg object-cover border border-white/10 cursor-pointer hover:opacity-80 transition"
                                onClick={() => window.open(result.photoUrl!, '_blank')}
                                title="Фото вручения"
                              />
                            )}
                            {result.status === 'awarded' && (
                              <span className="text-xs font-bold text-green-400 bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded-lg whitespace-nowrap">
                                🎁 Приз получен
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Referral CTA */}
          {tab === 'referrals' && (
            <div className="bg-gradient-to-br from-yellow-400/10 to-transparent border border-yellow-400/20 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">🌟</div>
              <h3 className="text-xl font-bold mb-2">Стань амбассадором</h3>
              <p className="text-gray-400 text-sm font-mono mb-4 max-w-md mx-auto">
                Приглашай друзей по своей ссылке и попади в топ. Лучшие получат подарки от платформы!
              </p>
              <Link href="/profile"
                className="inline-block bg-yellow-400 text-black font-extrabold uppercase tracking-widest px-6 py-3 rounded-lg hover:bg-yellow-300 transition">
                Моя реферальная ссылка →
              </Link>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}