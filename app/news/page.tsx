// app/news/page.tsx
// Путь: app/news/page.tsx

"use client"
import { useEffect, useState, useMemo } from "react"
import SiteHeader from "../components/SiteHeader"
import { useAuth } from "../hooks/useAuth"

export default function NewsPage() {
  const { user } = useAuth()
  const [news, setNews]                         = useState<any[]>([])
  const [newsLoading, setNewsLoading]           = useState(true)
  const [selectedTag, setSelectedTag]           = useState<string | null>(null)
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({})
  const [commentTexts, setCommentTexts]         = useState<Record<number, string>>({})

  useEffect(() => {
    setNewsLoading(true)
    fetch("/api/news")
      .then(r => r.json())
      .then(d => { setNews(d); setNewsLoading(false) })
      .catch(() => setNewsLoading(false))
  }, [])

  const handleLike = async (postId: number) => {
    if (!user) return alert("Авторизуйтесь, чтобы ставить лайки!")
    const res = await fetch(`/api/news/${postId}/like`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    })
    if (res.ok) {
      const data = await res.json()
      setNews(news.map(p => p.id !== postId ? p : {
        ...p,
        likes:  data.liked ? [...p.likes, { userId: user.id }] : p.likes.filter((l: any) => l.userId !== user.id),
        _count: { ...p._count, likes: data.liked ? p._count.likes + 1 : p._count.likes - 1 },
      }))
    }
  }

  const submitComment = async (postId: number) => {
    if (!user) return alert("Авторизуйтесь!")
    const text = commentTexts[postId]?.trim()
    if (!text) return
    const res = await fetch(`/api/news/${postId}/comment`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, content: text }),
    })
    if (res.ok) {
      const c = await res.json()
      setNews(news.map(p => p.id !== postId ? p : {
        ...p, comments: [...p.comments, c],
        _count: { ...p._count, comments: p._count.comments + 1 },
      }))
      setCommentTexts({ ...commentTexts, [postId]: "" })
    }
  }

  const allTags = useMemo(() => {
    const s = new Set<string>()
    news.forEach(p => { try { JSON.parse(p.tags || "[]").forEach((t: string) => s.add(t)) } catch {} })
    return Array.from(s)
  }, [news])

  const filteredNews = selectedTag
    ? news.filter(p => { try { return JSON.parse(p.tags || "[]").includes(selectedTag) } catch { return false } })
    : news

  return (
    <div className="min-h-screen flex flex-col items-center p-8 bg-[#121212] text-white">
      <SiteHeader activePage="news" />

      <main className="w-full max-w-6xl flex-grow flex flex-col">

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 justify-center md:justify-start">
            <button onClick={() => setSelectedTag(null)}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition ${
                !selectedTag ? 'bg-white text-black' : 'bg-[#1a1a1a] text-gray-400 hover:bg-white/10 border border-white/10'
              }`}>Все</button>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition ${
                  selectedTag === tag ? 'bg-yellow-400 text-black' : 'bg-[#1a1a1a] text-gray-400 hover:bg-white/10 border border-white/10'
                }`}>#{tag}</button>
            ))}
          </div>
        )}

        {newsLoading ? (
          <div className="flex justify-center py-20">
            <div className="inline-block w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="bg-[#1a1a1a] border-2 border-dashed border-white/10 rounded-xl p-10 text-center text-gray-400 font-mono">
            Новостей пока нет.
          </div>
        ) : (
          <div className="space-y-8 max-w-4xl mx-auto w-full">
            {filteredNews.map(post => {
              const tags         = JSON.parse(post.tags || "[]")
              const isLikedByMe  = user && post.likes.some((l: any) => l.userId === user.id)
              const showComments = expandedComments[post.id]

              return (
                <article key={post.id}
                  className="bg-[#1a1a1a] rounded-2xl border-2 border-white/10 overflow-hidden shadow-2xl hover:border-white/20 transition">

                  {post.imageUrl && (
                    <div className="w-full h-64 md:h-80 overflow-hidden border-b border-white/10 bg-black">
                      <img src={post.imageUrl} alt={post.title}
                        className="w-full h-full object-cover opacity-90 hover:opacity-100 transition" />
                    </div>
                  )}

                  <div className="p-6 md:p-8">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <h2 className="text-3xl font-bold text-white leading-tight uppercase tracking-tight">
                        {post.title}
                      </h2>
                      <span className="text-xs font-mono text-gray-500 whitespace-nowrap bg-black/50 px-3 py-1 rounded-full border border-white/5">
                        {new Date(post.createdAt).toLocaleDateString("ru-RU", { day: 'numeric', month: 'long' })}
                      </span>
                    </div>

                    {tags.length > 0 && (
                      <div className="flex gap-2 mb-6 flex-wrap">
                        {tags.map((tag: string) => (
                          <span key={tag}
                            className="px-2 py-0.5 bg-white/5 text-yellow-400 text-xs rounded border border-yellow-400/20 uppercase font-bold tracking-widest">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-gray-300 mb-8 whitespace-pre-wrap leading-relaxed text-sm md:text-base border-l-2 border-white/10 pl-4">
                      {post.content}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10">
                      <button onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
                          isLikedByMe
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                        }`}>
                        <span className={isLikedByMe ? "scale-110" : "opacity-70"}>❤️</span>
                        {post._count.likes}
                      </button>

                      <button onClick={() => setExpandedComments(p => ({ ...p, [post.id]: !p[post.id] }))}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
                          showComments
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                        }`}>
                        <span>💬</span> {post._count.comments}
                      </button>

                      <span className="ml-auto flex items-center gap-2 text-sm text-gray-500 font-bold uppercase tracking-widest">
                        {post.author?.photoUrl && (
                          <img src={post.author.photoUrl}
                            className="w-6 h-6 rounded-full opacity-70 border border-white/20" />
                        )}
                        {post.author?.firstName || "Админ"}
                      </span>
                    </div>
                  </div>

                  {showComments && (
                    <div className="bg-black/40 border-t border-white/5 p-6">
                      <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
                        {post.comments?.length === 0 ? (
                          <p className="text-gray-500 text-sm italic text-center py-4 font-mono">
                            Будьте первым, кто оставит комментарий!
                          </p>
                        ) : post.comments.map((c: any) => (
                          <div key={c.id} className="flex gap-3 bg-[#1a1a1a] p-4 rounded-xl border border-white/5">
                            {c.author?.photoUrl
                              ? <img src={c.author.photoUrl} className="w-8 h-8 rounded-full flex-shrink-0" />
                              : <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-xs">?</div>
                            }
                            <div>
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-200">{c.author?.firstName || "Ученик"}</span>
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {new Date(c.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400 leading-snug">{c.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {user ? (
                        <div className="flex gap-3">
                          <input type="text"
                            placeholder="Написать комментарий..."
                            value={commentTexts[post.id] || ""}
                            onChange={e => setCommentTexts({ ...commentTexts, [post.id]: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && submitComment(post.id)}
                            className="flex-grow bg-[#121212] border border-white/10 rounded-lg px-4 text-sm text-white focus:outline-none focus:border-yellow-400 transition"
                          />
                          <button onClick={() => submitComment(post.id)}
                            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded-lg text-sm uppercase tracking-wider transition">
                            Отправить
                          </button>
                        </div>
                      ) : (
                        <div className="text-center p-3 border border-dashed border-white/10 rounded-lg text-sm text-gray-500 font-mono">
                          Авторизуйтесь, чтобы оставлять комментарии
                        </div>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}