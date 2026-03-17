'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface LeaderEntry {
  rank: number
  telegramId: string
  firstName: string
  username: string | null
  photoUrl: string | null
  score: number
  homeworkDone?: number
  totalPoints?: number
  referralPoints?: number
  prize?: string | null
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [tab, setTab] = useState<'points' | 'referrals'>('points')
  const [period, setPeriod] = useState<'all' | 'month'>('all')
  const [data, setData] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [myTgId, setMyTgId] = useState<string | null>(null)

  useEffect(() => {
    setMyTgId(localStorage.getItem('user_id'))
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
    <div className="min-h-screen bg-[#121212] text-white font-sans">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link
            href="/"
            className="text-xs font-mono text-gray-500 hover:text-white transition uppercase tracking-widest border-b border-transparent hover:border-white pb-0.5 inline-block mb-6"
          >
            ← На главную
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight">
                Рейтинг
              </h1>
              <p className="text-gray-400 font-mono text-sm mt-2">
                Лучшие ученики и амбассадоры платформы
              </p>
            </div>

            {myRank > 0 && (
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-5 py-3 text-center">
                <span className="block text-xs font-mono text-yellow-400/70 uppercase tracking-widest mb-1">
                  Ваша позиция
                </span>
                <span className="text-3xl font-black text-yellow-400">#{myRank}</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-8">
            <button
              onClick={() => setTab('points')}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-widest transition ${
                tab === 'points'
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              🏆 Успеваемость
            </button>
            <button
              onClick={() => setTab('referrals')}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-widest transition ${
                tab === 'referrals'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              🌟 Амбассадоры
            </button>
          </div>

          {/* Period filter (only for points) */}
          {tab === 'points' && (
            <div className="flex gap-2 mt-3">
              {(['all', 'month'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 rounded text-xs font-mono uppercase tracking-widest transition ${
                    period === p
                      ? 'bg-white/20 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {p === 'all' ? 'Всё время' : 'Этот месяц'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20 text-gray-500 font-mono">
            Данных пока нет
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((entry, idx) => {
              const isMe = entry.telegramId === myTgId
              const medal = MEDALS[idx] ?? null
              const isTop3 = idx < 3

              return (
                <div
                  key={entry.telegramId}
                  className={`relative flex items-center gap-4 p-5 rounded-xl border transition ${
                    isMe
                      ? 'bg-yellow-400/10 border-yellow-400/40'
                      : isTop3
                      ? 'bg-[#1a1a1a] border-white/20'
                      : 'bg-[#1a1a1a] border-white/5 hover:border-white/15'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-10 text-center flex-shrink-0">
                    {medal ? (
                      <span className="text-2xl">{medal}</span>
                    ) : (
                      <span className="text-lg font-black text-gray-500">
                        #{entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <img
                    src={
                      entry.photoUrl ??
                      `https://ui-avatars.com/api/?name=${entry.firstName}&background=random`
                    }
                    alt="avatar"
                    className={`w-12 h-12 rounded-full border-2 flex-shrink-0 ${
                      isTop3 ? 'border-yellow-400/50' : 'border-white/10'
                    }`}
                  />

                  {/* Name + details */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-bold text-lg truncate ${
                          isMe ? 'text-yellow-400' : 'text-white'
                        }`}
                      >
                        {entry.firstName}
                        {isMe && (
                          <span className="ml-2 text-xs bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded font-mono uppercase tracking-widest">
                            Вы
                          </span>
                        )}
                      </span>
                    </div>

                    {entry.username && (
                      <span className="text-xs text-gray-500 font-mono">
                        @{entry.username}
                      </span>
                    )}

                    {/* Prize for referral top */}
                    {entry.prize && (
                      <div className="mt-1 text-xs text-yellow-300 bg-yellow-400/10 border border-yellow-400/20 rounded px-2 py-0.5 inline-block">
                        🎁 {entry.prize}
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <div className="flex-shrink-0 text-right">
                    {tab === 'points' ? (
                      <div>
                        <span className="text-2xl font-black text-white">
                          {entry.score}
                        </span>
                        <span className="text-yellow-400 ml-1">💎</span>
                        {entry.homeworkDone !== undefined && (
                          <div className="text-xs text-gray-500 font-mono mt-0.5">
                            {entry.homeworkDone} ДЗ
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="text-2xl font-black text-white">
                          {entry.score}
                        </span>
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

        {/* Referral CTA */}
        {tab === 'referrals' && (
          <div className="mt-8 bg-gradient-to-br from-yellow-400/10 to-transparent border border-yellow-400/20 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🌟</div>
            <h3 className="text-xl font-bold mb-2">Стань амбассадором</h3>
            <p className="text-gray-400 text-sm font-mono mb-4 max-w-md mx-auto">
              Приглашай друзей по своей ссылке и попади в топ. Лучшие получат
              подарки от платформы!
            </p>
            <Link
              href="/profile"
              className="inline-block bg-yellow-400 text-black font-extrabold uppercase tracking-widest px-6 py-3 rounded-lg hover:bg-yellow-300 transition"
            >
              Моя реферальная ссылка →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}