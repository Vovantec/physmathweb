'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ReferralData {
  code: string
  referrals: Array<{
    createdAt: string
    referred: {
      firstName: string | null
      username: string | null
      photoUrl: string | null
      points: number
    }
  }>
  referralPoints: number
  totalReferred: number
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [referral, setReferral] = useState<ReferralData | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = localStorage.getItem('user_id')
    const name = localStorage.getItem('user_name')
    const photo = localStorage.getItem('user_photo')
    const isAdmin = localStorage.getItem('user_is_admin') === 'true'

    if (!id) { setLoading(false); return }

    setUser({ id, name, photo, isAdmin })

    fetch(`/api/referral?userId=${id}`)
      .then(r => r.json())
      .then(d => { setReferral(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const refUrl = referral
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://physmathlab.ru'}?ref=${referral.code}`
    : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(refUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'ФизМат by Шевелев',
        text: 'Присоединяйся к курсам подготовки к ЕГЭ!',
        url: refUrl,
      })
    } else {
      handleCopy()
    }
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Вы не авторизованы</p>
          <Link href="/" className="text-yellow-400 hover:underline">На главную</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link
          href="/"
          className="text-xs font-mono text-gray-500 hover:text-white transition uppercase tracking-widest border-b border-transparent hover:border-white pb-0.5 inline-block mb-8"
        >
          ← На главную
        </Link>

        {/* Profile card */}
        {user && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 mb-6 flex items-center gap-6">
            {user.photo ? (
              <img
                src={user.photo}
                alt="avatar"
                className="w-20 h-20 rounded-2xl border-2 border-white/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-3xl">
                👤
              </div>
            )}
            <div>
              <h1 className="text-2xl font-extrabold uppercase tracking-tight">
                {user.name ?? `ID: ${user.id}`}
              </h1>
              <p className="text-gray-500 font-mono text-sm mt-1">
                Telegram ID: {user.id}
              </p>
              {user.isAdmin && (
                <span className="mt-2 inline-block text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded font-mono uppercase tracking-widest">
                  Администратор
                </span>
              )}
            </div>
          </div>
        )}

        {/* Referral block */}
        {loading ? (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 animate-pulse">
            <div className="h-6 bg-white/10 rounded w-48 mb-4" />
            <div className="h-14 bg-white/10 rounded" />
          </div>
        ) : referral && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 text-center">
                <span className="block text-3xl font-black text-yellow-400">
                  {referral.totalReferred}
                </span>
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-1 block">
                  Приглашено
                </span>
              </div>
              <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 text-center">
                <span className="block text-3xl font-black text-yellow-400">
                  {referral.referralPoints}
                </span>
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-1 block">
                  Реф. баллы 💎
                </span>
              </div>
              <Link
                href="/leaderboard?tab=referrals"
                className="bg-[#1a1a1a] border border-white/10 hover:border-yellow-400/40 rounded-xl p-5 text-center transition group"
              >
                <span className="block text-3xl group-hover:scale-110 transition-transform">🌟</span>
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-1 block group-hover:text-yellow-400 transition">
                  Рейтинг
                </span>
              </Link>
            </div>

            {/* Referral link card */}
            <div className="bg-gradient-to-br from-yellow-400/10 via-transparent to-transparent border border-yellow-400/20 rounded-2xl p-8 mb-6">
              <h2 className="text-xl font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <span>🔗</span> Ваша реферальная ссылка
              </h2>
              <p className="text-gray-400 text-sm font-mono mb-5">
                Поделитесь с друзьями — они получат бесплатный доступ к вводным
                урокам, а вы — бонусные баллы 💎
              </p>

              <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center gap-3 mb-4">
                <span className="text-sm font-mono text-gray-300 flex-grow truncate">
                  {refUrl}
                </span>
                <button
                  onClick={handleCopy}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${
                    copied
                      ? 'bg-green-500 text-black'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {copied ? '✓ Скопировано' : 'Копировать'}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleShare}
                  className="flex-grow bg-yellow-400 text-black font-extrabold uppercase tracking-widest py-3 rounded-xl hover:bg-yellow-300 transition"
                >
                  Поделиться →
                </button>
              </div>

              {/* Rewards hint */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                  <span className="text-yellow-400 font-bold block mb-1">За регистрацию друга</span>
                  <span className="text-gray-400">+50 реф. баллов 💎</span>
                </div>
                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                  <span className="text-yellow-400 font-bold block mb-1">За первое ДЗ друга</span>
                  <span className="text-gray-400">+100 реф. баллов 💎</span>
                </div>
              </div>
            </div>

            {/* Referred users list */}
            {referral.referrals.length > 0 && (
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold uppercase tracking-widest mb-4">
                  Приглашённые ученики
                </h3>
                <div className="space-y-3">
                  {referral.referrals.map((r, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-3 bg-white/5 rounded-xl"
                    >
                      <img
                        src={
                          r.referred.photoUrl ??
                          `https://ui-avatars.com/api/?name=${r.referred.firstName ?? 'U'}&background=random`
                        }
                        alt="avatar"
                        className="w-10 h-10 rounded-full border border-white/10"
                      />
                      <div className="flex-grow">
                        <span className="font-bold text-sm">
                          {r.referred.firstName ?? r.referred.username ?? 'Ученик'}
                        </span>
                        <span className="text-xs text-gray-500 font-mono block">
                          {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <span className="text-yellow-400 font-bold text-sm">
                        {r.referred.points} 💎
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}