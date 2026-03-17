// app/chat/page.tsx
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import SiteHeader from '../components/SiteHeader'
import { useAuth } from '../hooks/useAuth'

interface Channel {
  id:          number
  name:        string
  description: string | null
  isPinned:    boolean
  isDefault:   boolean
  unread:      number | null
}

interface ChatMsg {
  id:        number
  channelId: number
  content:   string
  createdAt: string
  editedAt?: string | null
  user: {
    id:        number
    firstName: string | null
    photoUrl:  string | null
    username:  string | null
  }
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'

export default function ChatPage() {
  const { user, loading } = useAuth()

  const [channels, setChannels]         = useState<Channel[]>([])
  const [activeId, setActiveId]         = useState<number | null>(null)
  const [messages, setMessages]         = useState<ChatMsg[]>([])
  const [msgLoading, setMsgLoading]     = useState(false)
  const [hasMore, setHasMore]           = useState(false)
  const [input, setInput]               = useState('')
  const [editingId, setEditingId]       = useState<number | null>(null)
  const [editContent, setEditContent]   = useState('')
  const [typingUsers, setTypingUsers]   = useState<number[]>([])
  const [isAdmin, setIsAdmin]           = useState(false)
  const [newChanName, setNewChanName]   = useState('')
  const [showNewChan, setShowNewChan]   = useState(false)
  const [muted, setMuted]               = useState(false)

  const wsRef         = useRef<WebSocket | null>(null)
  const bottomRef     = useRef<HTMLDivElement>(null)
  const messagesRef   = useRef<HTMLDivElement>(null)
  const typingTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeIdRef   = useRef<number | null>(null)

  activeIdRef.current = activeId

  // ── Load channels ─────────────────────────────────────────────────────────
  const loadChannels = useCallback(async () => {
    const r = await fetch('/api/chat/channels')
    if (r.ok) {
      const data: Channel[] = await r.json()
      setChannels(data)
      if (!activeIdRef.current && data.length > 0) setActiveId(data[0].id)
    }
  }, [])

  useEffect(() => { loadChannels() }, [loadChannels])

  // Check admin
  useEffect(() => {
    if (user?.isAdmin) setIsAdmin(true)
  }, [user])

  // Load mute setting
  useEffect(() => {
    if (!user) return
    fetch('/api/notifications/settings')
      .then(r => r.json())
      .then(d => setMuted(d.chatMuted ?? false))
      .catch(() => {})
  }, [user])

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !user) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      // Auth: get token from cookie via API
      fetch('/api/auth/me')
        .then(r => r.json())
        .then(d => {
          if (d.token) ws.send(JSON.stringify({ type: 'auth', token: d.token }))
        })
    }

    ws.onmessage = (e) => {
      let msg: any
      try { msg = JSON.parse(e.data) } catch { return }

      if (msg.type === 'auth_ok') {
        // Join current channel
        if (activeIdRef.current) {
          ws.send(JSON.stringify({ type: 'join', channelId: activeIdRef.current }))
        }
        return
      }

      if (msg.type === 'message') {
        if (msg.channelId === activeIdRef.current) {
          setMessages(prev => [...prev, msg])
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
        // Update unread badge for other channels
        setChannels(prev => prev.map(ch =>
          ch.id === msg.channelId && ch.id !== activeIdRef.current
            ? { ...ch, unread: (ch.unread ?? 0) + 1 }
            : ch
        ))
        return
      }

      if (msg.type === 'edit') {
        setMessages(prev => prev.map(m =>
          m.id === msg.id ? { ...m, content: msg.content, editedAt: msg.editedAt } : m
        ))
        return
      }

      if (msg.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== msg.id))
        return
      }

      if (msg.type === 'typing') {
        if (msg.userId === user.dbId) return
        setTypingUsers(prev => {
          if (prev.includes(msg.userId)) return prev
          return [...prev, msg.userId]
        })
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(id => id !== msg.userId))
        }, 3000)
        return
      }
    }

    ws.onclose = () => {}

    return () => { ws.close() }
  }, [user, loading])

  // ── Switch channel ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeId) return

    // Join WS room
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'join', channelId: activeId }))
    }

    // Load history
    setMsgLoading(true)
    setMessages([])
    setHasMore(false)
    fetch(`/api/chat/channels/${activeId}/messages?limit=50`)
      .then(r => r.json())
      .then((data: ChatMsg[]) => {
        setMessages(data)
        setHasMore(data.length === 50)
        setMsgLoading(false)
        setTimeout(() => bottomRef.current?.scrollIntoView(), 50)
        // Mark as read using already loaded messages
        markRead(activeId, data)
      })
      .catch(() => setMsgLoading(false))

    // Reset unread in sidebar
    setChannels(prev => prev.map(ch => ch.id === activeId ? { ...ch, unread: 0 } : ch))
  }, [activeId])

  const markRead = async (channelId: number, msgs?: ChatMsg[]) => {
    // Use provided messages or fetch the latest one
    const list = msgs ?? await fetch(`/api/chat/channels/${channelId}/messages?limit=50`)
      .then(r => r.json()).catch(() => [])
    if (list.length > 0) {
      const lastId = list[list.length - 1].id
      await fetch(`/api/chat/channels/${channelId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastReadMsgId: lastId })
      })
    }
  }

  // ── Load more (scroll up) ─────────────────────────────────────────────────
  const loadMore = async () => {
    if (!activeId || !hasMore || messages.length === 0) return
    const firstId = messages[0].id
    const data: ChatMsg[] = await fetch(
      `/api/chat/channels/${activeId}/messages?before=${firstId}&limit=50`
    ).then(r => r.json()).catch(() => [])
    if (data.length > 0) {
      setMessages(prev => [...data, ...prev])
      setHasMore(data.length === 50)
    } else {
      setHasMore(false)
    }
  }

  // ── Scroll handler for load more ──────────────────────────────────────────
  const onScroll = () => {
    const el = messagesRef.current
    if (!el) return
    if (el.scrollTop < 100) loadMore()
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  const send = () => {
    const content = input.trim()
    if (!content || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'message', content }))
    setInput('')
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  const submitEdit = () => {
    const content = editContent.trim()
    if (!content || !wsRef.current) return
    wsRef.current.send(JSON.stringify({ type: 'edit', id: editingId, content }))
    setEditingId(null)
    setEditContent('')
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMsg = (id: number) => {
    if (!wsRef.current) return
    if (!confirm('Удалить сообщение?')) return
    wsRef.current.send(JSON.stringify({ type: 'delete', id }))
  }

  // ── Typing ────────────────────────────────────────────────────────────────
  const onType = (v: string) => {
    setInput(v)
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    if (typingTimer.current) clearTimeout(typingTimer.current)
    wsRef.current.send(JSON.stringify({ type: 'typing' }))
    typingTimer.current = setTimeout(() => {}, 3000)
  }

  // ── Mute toggle ───────────────────────────────────────────────────────────
  const toggleMute = async () => {
    const next = !muted
    setMuted(next)
    await fetch('/api/notifications/settings', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chatMuted: next }),
    })
  }

  // ── Create channel ────────────────────────────────────────────────────────
  const createChannel = async () => {
    if (!newChanName.trim()) return
    const r = await fetch('/api/chat/channels', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: newChanName.trim() }),
    })
    if (r.ok) {
      setNewChanName('')
      setShowNewChan(false)
      await loadChannels()
    }
  }

  const activeChannel = channels.find(c => c.id === activeId)
  const totalUnread = channels.reduce((s, c) => s + (c.unread ?? 0), 0)

  if (!loading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center p-8 bg-[#121212] text-white">
        <SiteHeader activePage="chat" />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-gray-400 font-mono">Войдите, чтобы использовать чат</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-8 bg-[#121212] text-white">
      <SiteHeader activePage="chat" />

      <main className="w-full max-w-6xl flex-grow flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="w-64 flex-shrink-0 flex flex-col bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">

          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="font-bold text-sm uppercase tracking-widest text-gray-400">Каналы</span>
            <div className="flex items-center gap-2">
              {/* Mute toggle */}
              <button
                onClick={toggleMute}
                className={`text-xs px-2 py-1 rounded border transition ${
                  muted
                    ? 'border-gray-600 text-gray-500 hover:text-gray-300'
                    : 'border-white/10 text-gray-400 hover:text-white'
                }`}
                title={muted ? 'Уведомления заглушены' : 'Уведомления включены'}
              >
                {muted ? '🔕' : '🔔'}
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowNewChan(v => !v)}
                  className="text-gray-500 hover:text-yellow-400 transition text-lg leading-none"
                  title="Создать канал"
                >+</button>
              )}
            </div>
          </div>

          {/* New channel form */}
          {showNewChan && (
            <div className="px-3 py-2 border-b border-white/10 flex gap-2">
              <input
                value={newChanName}
                onChange={e => setNewChanName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createChannel()}
                placeholder="Название..."
                className="flex-grow bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-yellow-400"
              />
              <button onClick={createChannel}
                className="text-xs bg-yellow-400 text-black font-bold px-2 py-1 rounded hover:bg-yellow-300 transition">
                ОК
              </button>
            </div>
          )}

          {/* Channel list */}
          <div className="flex-grow overflow-y-auto">
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveId(ch.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-2 transition border-b border-white/5 last:border-0 ${
                  activeId === ch.id
                    ? 'bg-yellow-400/10 border-l-2 border-l-yellow-400'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-1.5">
                    {ch.isPinned && <span className="text-xs text-yellow-400">📌</span>}
                    <span className={`font-bold text-sm truncate ${activeId === ch.id ? 'text-yellow-400' : 'text-white'}`}>
                      {ch.name}
                    </span>
                  </div>
                  {ch.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{ch.description}</p>
                  )}
                </div>
                {ch.unread != null && ch.unread > 0 && (
                  <span className={`flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${
                    muted ? 'bg-gray-600 text-gray-300' : 'bg-red-500 text-white'
                  }`}>
                    {ch.unread > 99 ? '99+' : ch.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* ── Chat area ────────────────────────────────────────────────── */}
        <div className="flex-grow flex flex-col bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">

          {/* Channel header */}
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3">
            {activeChannel?.isPinned && <span className="text-yellow-400">📌</span>}
            <div className="flex-grow">
              <h2 className="font-bold text-base">{activeChannel?.name ?? '...'}</h2>
              {activeChannel?.description && (
                <p className="text-xs text-gray-500">{activeChannel.description}</p>
              )}
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesRef}
            onScroll={onScroll}
            className="flex-grow overflow-y-auto px-4 py-4 space-y-1"
          >
            {hasMore && (
              <button onClick={loadMore}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-300 py-2 font-mono transition">
                ↑ Загрузить ещё
              </button>
            )}

            {msgLoading ? (
              <div className="space-y-3 pt-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse flex-shrink-0" />
                    <div className="space-y-1.5 flex-grow">
                      <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                      <div className="h-4 w-2/3 bg-white/5 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-grow flex items-center justify-center py-20">
                <p className="text-gray-500 font-mono text-sm">Сообщений пока нет. Напишите первым!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.user.id === user?.dbId
                const prevMsg = messages[idx - 1]
                const sameUser = prevMsg?.user.id === msg.user.id &&
                  new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 5 * 60 * 1000

                return (
                  <div key={msg.id} className={`flex gap-3 group ${sameUser ? 'mt-0.5' : 'mt-3'}`}>
                    {/* Avatar */}
                    <div className="w-8 flex-shrink-0 mt-0.5">
                      {!sameUser && (
                        <img
                          src={msg.user.photoUrl ?? `https://ui-avatars.com/api/?name=${msg.user.firstName ?? 'U'}&background=random&size=32`}
                          alt=""
                          className="w-8 h-8 rounded-full border border-white/10"
                        />
                      )}
                    </div>

                    <div className="flex-grow min-w-0">
                      {!sameUser && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className={`text-sm font-bold ${isMe ? 'text-yellow-400' : 'text-white'}`}>
                            {msg.user.firstName ?? msg.user.username ?? 'Участник'}
                          </span>
                          {isMe && <span className="text-[10px] text-yellow-400/60 font-mono">Вы</span>}
                          <span className="text-[10px] text-gray-600 font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}

                      {editingId === msg.id ? (
                        <div className="flex gap-2 mt-1">
                          <input
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') submitEdit()
                              if (e.key === 'Escape') { setEditingId(null); setEditContent('') }
                            }}
                            className="flex-grow bg-black/40 border border-yellow-400/40 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400"
                            autoFocus
                          />
                          <button onClick={submitEdit}
                            className="text-xs bg-yellow-400 text-black font-bold px-3 py-1.5 rounded hover:bg-yellow-300 transition">
                            ✓
                          </button>
                          <button onClick={() => { setEditingId(null); setEditContent('') }}
                            className="text-xs text-gray-500 hover:text-white px-2 transition">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <p className={`text-sm text-gray-200 leading-relaxed break-words min-w-0 flex-grow ${sameUser ? '' : ''}`}>
                            {msg.content}
                            {msg.editedAt && (
                              <span className="text-[10px] text-gray-600 ml-1.5">(ред.)</span>
                            )}
                          </p>
                          {/* Actions */}
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition flex gap-1">
                            {isMe && (
                              <button
                                onClick={() => { setEditingId(msg.id); setEditContent(msg.content) }}
                                className="text-[11px] text-gray-500 hover:text-yellow-400 px-1.5 py-0.5 rounded hover:bg-white/5 transition"
                                title="Редактировать"
                              >✏️</button>
                            )}
                            {(isMe || isAdmin) && (
                              <button
                                onClick={() => deleteMsg(msg.id)}
                                className="text-[11px] text-gray-500 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-white/5 transition"
                                title="Удалить"
                              >🗑️</button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex gap-3 mt-2">
                <div className="w-8" />
                <div className="flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">печатает...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/10">
            {user ? (
              <div className="flex gap-3 items-end">
                <div className="flex-grow relative">
                  <textarea
                    value={input}
                    onChange={e => onType(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        send()
                      }
                    }}
                    placeholder="Написать сообщение... (Enter — отправить, Shift+Enter — перенос)"
                    rows={1}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-400 transition resize-none"
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={send}
                  disabled={!input.trim()}
                  className="flex-shrink-0 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed text-black font-black px-5 py-3 rounded-xl transition uppercase tracking-widest text-sm"
                >
                  →
                </button>
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500 font-mono py-1">
                Войдите, чтобы писать в чат
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}