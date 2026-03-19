'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/hooks/useAuth'
import Link from 'next/link'

export default function ChatInvitePage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { user, loading } = useAuth()

  const [invite, setInvite] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'joining' | 'joined' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!id) return
    fetch(`/api/chat/invite/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErrorMsg(d.error); setStatus('error') }
        else { setInvite(d); setStatus('ready') }
      })
      .catch(() => { setErrorMsg('Ошибка загрузки'); setStatus('error') })
  }, [id])

  const handleJoin = async () => {
    if (!user) return
    setStatus('joining')
    const res = await fetch(`/api/chat/invite/${id}`, { method: 'POST' })
    const data = await res.json()
    if (res.ok && data.success) {
      setStatus('joined')
      setTimeout(() => router.push('/chat'), 1500)
    } else {
      setErrorMsg(data.error || 'Ошибка вступления')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-8 text-white">
      <div className="max-w-md w-full bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl text-center">

        {status === 'loading' && (
          <div className="animate-pulse text-gray-400 font-mono">Загрузка...</div>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">🔗</div>
            <h1 className="text-xl font-bold text-red-400 mb-2">Ссылка недействительна</h1>
            <p className="text-gray-500 font-mono text-sm mb-6">{errorMsg}</p>
            <Link href="/chat" className="bg-white text-black font-bold uppercase tracking-widest px-6 py-3 rounded-lg hover:bg-yellow-400 transition">
              В чат
            </Link>
          </>
        )}

        {(status === 'ready' || status === 'joining') && invite && (
          <>
            <div className="text-5xl mb-4">💬</div>
            <h1 className="text-2xl font-extrabold uppercase tracking-tight mb-2">
              Приглашение в чат
            </h1>
            <p className="text-yellow-400 font-bold text-xl mb-2">{invite.channelName}</p>
            {invite.description && (
              <p className="text-gray-400 text-sm font-mono mb-4">{invite.description}</p>
            )}
            <div className="flex gap-4 justify-center text-xs font-mono text-gray-500 mb-8">
              <span>🔗 Осталось использований: {invite.usageLeft}</span>
              <span>⏰ До {new Date(invite.expiresAt).toLocaleDateString('ru-RU')}</span>
            </div>

            {!user && !loading ? (
              <p className="text-gray-400 font-mono text-sm">
                Войдите через Telegram, чтобы вступить в чат.
              </p>
            ) : (
              <button
                onClick={handleJoin}
                disabled={status === 'joining'}
                className="w-full bg-yellow-400 text-black font-extrabold uppercase tracking-widest py-4 rounded-xl hover:bg-yellow-300 transition disabled:opacity-50"
              >
                {status === 'joining' ? 'Вступаю...' : 'Вступить в чат'}
              </button>
            )}
          </>
        )}

        {status === 'joined' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-green-400 mb-2">Вы вступили в чат!</h1>
            <p className="text-gray-400 font-mono text-sm">Перенаправляем...</p>
          </>
        )}
      </div>
    </div>
  )
}