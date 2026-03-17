'use client'
import { useState, useEffect } from 'react'
import { formatTimeLeft, formatDeadline } from '@/lib/deadline'

interface DeadlineBannerProps {
  deadline: string | null     // ISO string
  isLate: boolean
  isBlocked: boolean
  policy: string
  penaltyMultiplier: number
}

export default function DeadlineBanner({
  deadline,
  isLate,
  isBlocked,
  policy,
  penaltyMultiplier,
}: DeadlineBannerProps) {
  const [hoursLeft, setHoursLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!deadline) return

    const update = () => {
      const msLeft = new Date(deadline).getTime() - Date.now()
      setHoursLeft(msLeft / (1000 * 60 * 60))
    }

    update()
    const id = setInterval(update, 60_000) // update every minute
    return () => clearInterval(id)
  }, [deadline])

  if (!deadline) return null

  // === BLOCKED ===
  if (isBlocked) {
    return (
      <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-xl p-5 flex items-start gap-4">
        <span className="text-3xl flex-shrink-0">🚫</span>
        <div>
          <h3 className="font-bold text-red-400 text-lg mb-1">Дедлайн истёк — сдача заблокирована</h3>
          <p className="text-sm text-gray-400 font-mono">
            Это задание нужно было сдать до {formatDeadline(new Date(deadline))}.
          </p>
        </div>
      </div>
    )
  }

  // === LATE WITH PENALTY ===
  if (isLate && policy === 'penalty') {
    return (
      <div className="mb-6 bg-orange-900/20 border border-orange-500/40 rounded-xl p-5 flex items-start gap-4">
        <span className="text-3xl flex-shrink-0">⚠️</span>
        <div>
          <h3 className="font-bold text-orange-400 text-lg mb-1">Дедлайн истёк — штраф к баллам</h3>
          <p className="text-sm text-gray-400 font-mono">
            Можно сдать, но вы получите только{' '}
            <span className="text-orange-300 font-bold">
              {Math.round(penaltyMultiplier * 100)}% от баллов
            </span>
            . Дедлайн был {formatDeadline(new Date(deadline))}.
          </p>
        </div>
      </div>
    )
  }

  // === LATE WITH MARK ===
  if (isLate && policy === 'mark') {
    return (
      <div className="mb-6 bg-blue-900/20 border border-blue-500/30 rounded-xl p-5 flex items-start gap-4">
        <span className="text-3xl flex-shrink-0">⏰</span>
        <div>
          <h3 className="font-bold text-blue-400 text-lg mb-1">Задание просрочено</h3>
          <p className="text-sm text-gray-400 font-mono">
            Дедлайн был {formatDeadline(new Date(deadline))}. Вы можете сдать, но это
            будет отмечено как просроченное.
          </p>
        </div>
      </div>
    )
  }

  // === UPCOMING DEADLINE ===
  if (hoursLeft === null) return null

  const isUrgent = hoursLeft < 24
  const isSoon   = hoursLeft < 72

  return (
    <div
      className={`mb-6 rounded-xl p-5 flex items-center gap-4 border ${
        isUrgent
          ? 'bg-red-900/20 border-red-500/40'
          : isSoon
          ? 'bg-yellow-900/20 border-yellow-500/30'
          : 'bg-white/5 border-white/10'
      }`}
    >
      <span className="text-2xl flex-shrink-0">{isUrgent ? '🔥' : '📅'}</span>
      <div className="flex-grow">
        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-0.5">
          Дедлайн
        </span>
        <span className="font-bold text-white">
          {formatDeadline(new Date(deadline))}
        </span>
      </div>
      <div className="flex-shrink-0 text-right">
        <span
          className={`text-lg font-black tabular-nums ${
            isUrgent ? 'text-red-400' : isSoon ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          {formatTimeLeft(hoursLeft)}
        </span>
        <span className="block text-xs font-mono text-gray-500">осталось</span>
      </div>
    </div>
  )
}