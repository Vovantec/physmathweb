'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/hooks/useAuth'
import Link from 'next/link'

interface Member {
  id: number
  role: string
  joinedAt: string
  user: { id: number; firstName: string | null; username: string | null; photoUrl: string | null }
}

interface Invite {
  id: string
  usageLimit: number
  usedCount: number
  expiresAt: string
  url: string
  isExpired: boolean
}

export default function ChatMembersPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { user } = useAuth()

  const [data, setData] = useState<{ channel: any; members: Member[]; myRole: string | null } | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [addingId, setAddingId] = useState<number | null>(null)
  const [kickingId, setKickingId] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Invite form
  const [inviteLimit, setInviteLimit] = useState('10')
  const [inviteDays, setInviteDays] = useState('7')
  const [creatingInvite, setCreatingInvite] = useState(false)

  const canManage = data?.myRole === 'owner' || user?.isAdmin

  const loadData = async () => {
    const [membersRes, invitesRes] = await Promise.all([
      fetch(`/api/chat/channels/${id}/members`),
      fetch(`/api/chat/channels/${id}/invites`),
    ])
    if (membersRes.ok) setData(await membersRes.json())
    if (invitesRes.ok) setInvites(await invitesRes.json())
    setLoading(false)
  }

  useEffect(() => {
    if (id) loadData()
  }, [id])

  useEffect(() => {
    if (canManage) {
      fetch('/api/admin/students').then(r => r.json()).then(setAllStudents).catch(() => {})
    }
  }, [canManage])

  const addMember = async (userId: number) => {
    setAddingId(userId)
    await fetch(`/api/chat/channels/${id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    await loadData()
    setAddingId(null)
  }

  const kickMember = async (userId: number) => {
    if (!confirm('Выгнать участника?')) return
    setKickingId(userId)
    await fetch(`/api/chat/channels/${id}/members?userId=${userId}`, { method: 'DELETE' })
    await loadData()
    setKickingId(null)
  }

  const leaveChat = async () => {
    if (!confirm('Покинуть чат?')) return
    const res = await fetch(`/api/chat/channels/${id}/members`, { method: 'DELETE' })
    if (res.ok) router.push('/chat')
  }

  const deleteChannel = async () => {
    if (!confirm(`Удалить канал «${data?.channel?.name}»? Это действие необратимо — все сообщения будут удалены.`)) return
    setDeleting(true)
    const res = await fetch(`/api/chat/channels/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/chat')
    } else {
      const err = await res.json()
      alert(err.error || 'Ошибка при удалении канала')
      setDeleting(false)
    }
  }

  const createInvite = async () => {
    setCreatingInvite(true)
    const res = await fetch(`/api/chat/channels/${id}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usageLimit: parseInt(inviteLimit), expiresInDays: parseInt(inviteDays) }),
    })
    if (res.ok) await loadData()
    setCreatingInvite(false)
  }

  const revokeInvite = async (inviteId: string) => {
    if (!confirm('Отозвать ссылку?')) return
    await fetch(`/api/chat/channels/${id}/invites?inviteId=${inviteId}`, { method: 'DELETE' })
    await loadData()
  }

  const copyInvite = (url: string, invId: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(invId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const memberIds = new Set(data?.members.map(m => m.user.id) ?? [])
  const nonMembers = allStudents.filter(s => !memberIds.has(s.id))

  if (loading) return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white font-mono animate-pulse">
      Загрузка...
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center text-red-400">
      Нет доступа
    </div>
  )

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-10 font-sans">
      <div className="max-w-3xl mx-auto">

        <Link href="/chat" className="inline-block mb-8 text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-white transition border-b border-transparent hover:border-white pb-1">
          ← Назад в чат
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div className="flex-grow">
            <h1 className="text-3xl font-extrabold uppercase tracking-tight">{data.channel?.name}</h1>
            <span className="text-xs font-mono text-gray-500 mt-1 block">
              🔒 Приватный · {data.members.length} участников
            </span>
          </div>
          <div className="h-px bg-white/20 flex-grow" />

          {/* Leave button (non-owners) */}
          {data.myRole !== 'owner' && !user?.isAdmin && (
            <button onClick={leaveChat} className="text-xs font-bold uppercase tracking-widest bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg transition">
              Покинуть
            </button>
          )}

          {/* Delete channel button (owner or admin) */}
          {canManage && (
            <button
              onClick={deleteChannel}
              disabled={deleting}
              className="text-xs font-bold uppercase tracking-widest bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 px-4 py-2 rounded-lg transition disabled:opacity-40 flex items-center gap-1.5"
            >
              {deleting ? '...' : '🗑️ Удалить канал'}
            </button>
          )}
        </div>

        {/* Members list */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl mb-6 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Участники</h2>
          </div>
          <div className="divide-y divide-white/5">
            {data.members.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <img
                  src={m.user.photoUrl ?? `https://ui-avatars.com/api/?name=${m.user.firstName ?? 'U'}&background=random`}
                  alt="" className="w-9 h-9 rounded-full border border-white/10 flex-shrink-0"
                />
                <div className="flex-grow min-w-0">
                  <div className="font-medium text-sm truncate">
                    {m.user.firstName ?? m.user.username ?? '?'}
                  </div>
                  <div className="text-xs font-mono text-gray-500">
                    {m.user.username ? `@${m.user.username}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {m.role === 'owner' && (
                    <span className="text-xs font-bold uppercase tracking-widest bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded">
                      Владелец
                    </span>
                  )}
                  {canManage && m.role !== 'owner' && m.user.id !== user?.dbId && (
                    <button
                      onClick={() => kickMember(m.user.id)}
                      disabled={kickingId === m.user.id}
                      className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-1 rounded transition font-mono disabled:opacity-40"
                    >
                      {kickingId === m.user.id ? '...' : 'Выгнать'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add members (owner/admin only) */}
        {canManage && nonMembers.length > 0 && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl mb-6 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Добавить участника</h2>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
              {nonMembers.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <img
                    src={s.photoUrl ?? `https://ui-avatars.com/api/?name=${s.firstName ?? 'U'}&background=random`}
                    alt="" className="w-8 h-8 rounded-full border border-white/10 flex-shrink-0"
                  />
                  <div className="flex-grow text-sm font-medium text-gray-300">
                    {s.firstName ?? s.username ?? '?'}
                  </div>
                  <button
                    onClick={() => addMember(s.id)}
                    disabled={addingId === s.id}
                    className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition disabled:opacity-40"
                  >
                    {addingId === s.id ? '...' : '+ Добавить'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite links (owner/admin only) */}
        {canManage && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Ссылки-приглашения</h2>
            </div>

            {/* Create invite */}
            <div className="px-5 py-4 border-b border-white/5 flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Лимит использований</label>
                <input
                  type="number" min="1" max="1000"
                  value={inviteLimit} onChange={e => setInviteLimit(e.target.value)}
                  className="w-24 bg-black/40 border border-white/10 rounded p-2 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none text-center"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Дней действия</label>
                <input
                  type="number" min="1" max="365"
                  value={inviteDays} onChange={e => setInviteDays(e.target.value)}
                  className="w-24 bg-black/40 border border-white/10 rounded p-2 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none text-center"
                />
              </div>
              <button
                onClick={createInvite}
                disabled={creatingInvite}
                className="bg-white text-black font-bold uppercase tracking-widest text-xs px-5 py-2.5 rounded-lg hover:bg-yellow-400 transition disabled:opacity-40"
              >
                {creatingInvite ? '...' : '+ Создать ссылку'}
              </button>
            </div>

            {/* Existing invites */}
            {invites.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-500 font-mono text-sm">
                Активных ссылок нет
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {invites.map(inv => (
                  <div key={inv.id} className={`px-5 py-3 flex flex-wrap gap-3 items-center ${inv.isExpired ? 'opacity-40' : ''}`}>
                    <div className="flex-grow min-w-0">
                      <div className="text-xs font-mono text-gray-400 truncate">{inv.url}</div>
                      <div className="text-xs text-gray-500 mt-0.5 font-mono">
                        {inv.usedCount}/{inv.usageLimit} использований ·
                        до {new Date(inv.expiresAt).toLocaleDateString('ru-RU')}
                        {inv.isExpired && <span className="text-red-400 ml-1">Исчерпана</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => copyInvite(inv.url, inv.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded transition ${
                          copiedId === inv.id ? 'bg-green-500 text-black' : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {copiedId === inv.id ? '✓' : 'Копировать'}
                      </button>
                      <button
                        onClick={() => revokeInvite(inv.id)}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 px-3 py-1.5 rounded transition"
                      >
                        Отозвать
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}