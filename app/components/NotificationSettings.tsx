// app/components/NotificationSettings.tsx
// Путь: app/components/NotificationSettings.tsx
'use client'
import { useState, useEffect } from 'react'

const SETTINGS = [
  { key: 'deadlineReminder', label: 'Напоминание о дедлайне',      icon: '⏰', desc: 'За 24 часа до истечения срока' },
  { key: 'newLesson',        label: 'Новый урок',                   icon: '📝', desc: 'Когда добавляется новый урок в курсе' },
  { key: 'newNews',          label: 'Новости платформы',            icon: '📢', desc: 'При публикации новой новости' },
  { key: 'ratingChange',     label: 'Изменение позиции в рейтинге', icon: '🏆', desc: 'При смене места в топе' },
  { key: 'prizeAwarded',     label: 'Приз и победа в розыгрыше',   icon: '🎁', desc: 'Уведомление о победе и вручении приза' },
] as const

type SettingKey = typeof SETTINGS[number]['key']

export default function NotificationSettings({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<Record<SettingKey, boolean> | null>(null)
  const [saving, setSaving]     = useState<SettingKey | null>(null)

  useEffect(() => {
    fetch(`/api/notifications/settings?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        const s: any = {}
        SETTINGS.forEach(({ key }) => { s[key] = d[key] ?? true })
        setSettings(s)
      })
  }, [userId])

  const toggle = async (key: SettingKey) => {
    if (!settings) return
    const newValue = !settings[key]
    setSettings(prev => prev ? { ...prev, [key]: newValue } : prev)
    setSaving(key)

    await fetch('/api/notifications/settings', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId, [key]: newValue }),
    })

    setSaving(null)
  }

  if (!settings) {
    return <div className="animate-pulse h-32 bg-white/5 rounded-xl" />
  }

  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
      <h2 className="text-lg font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
        🔔 Telegram-уведомления
      </h2>
      <p className="text-xs font-mono text-gray-500 mb-5">
        Уведомления приходят в Telegram. Можно отключить отдельные типы.
      </p>

      <div className="space-y-3">
        {SETTINGS.map(({ key, label, icon, desc }) => {
          const isOn = settings[key]
          return (
            <div key={key} className={`flex items-center gap-4 p-4 rounded-xl border transition ${
              isOn ? 'border-white/10 bg-white/5' : 'border-white/5 bg-black/20 opacity-60'
            }`}>
              <span className="text-xl flex-shrink-0">{icon}</span>
              <div className="flex-grow min-w-0">
                <div className="font-medium text-sm text-white">{label}</div>
                <div className="text-xs font-mono text-gray-500">{desc}</div>
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggle(key)}
                disabled={saving === key}
                className={`relative flex-shrink-0 w-11 h-6 rounded-full border transition-colors ${
                  isOn ? 'bg-yellow-400 border-yellow-400' : 'bg-black/40 border-white/20'
                } ${saving === key ? 'opacity-50' : ''}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                  isOn ? 'left-5 bg-black' : 'left-0.5 bg-white/40'
                }`} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}