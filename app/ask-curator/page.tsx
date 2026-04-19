'use client'
import { useState, useEffect } from 'react'
import SiteHeader from '../components/SiteHeader'
import { useAuth } from '../hooks/useAuth'
import FileManagerModal from '../components/admin/FileManagerModal'

const SUBJECTS = ['Физика', 'Математика (профиль)']

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  open:     { label: 'Ожидает ответа', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: '⏳' },
  answered: { label: 'Ответ получен',  color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: '✅' },
  closed:   { label: 'Закрыт',         color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', icon: '🔒' },
}

export default function AskCuratorPage() {
  const { user, loading } = useAuth()
  const [questions, setQuestions] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)

  // New question form
  const [subject, setSubject] = useState('Физика')
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileOpen, setFileOpen] = useState(false)

  const loadQuestions = () => {
    fetch('/api/curator-questions?mode=mine')
      .then(r => r.json())
      .then(d => { setQuestions(Array.isArray(d) ? d : []); setDataLoading(false) })
      .catch(() => setDataLoading(false))
  }

  useEffect(() => {
    if (!user) return
    setDataLoading(true)
    // Get user premium info
    fetch(`/api/admin/students/${user.dbId}`)
      .then(r => r.json())
      .then(d => setUserInfo(d))
      .catch(() => {})
    loadQuestions()
  }, [user])

  const startOfMonth = new Date()
  startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
  const usedThisMonth = questions.filter(q => new Date(q.createdAt) >= startOfMonth).length
  const limit = userInfo?.questionsLimit ?? 5
  const remaining = limit === 0 ? '∞' : Math.max(0, limit - usedThisMonth)
  const canAsk = userInfo?.isPremium && (limit === 0 || usedThisMonth < limit)

  const handleSubmit = async () => {
    if (!text.trim()) return
    setError(null)
    setSubmitting(true)
    const res = await fetch('/api/curator-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, text, imageUrl: imageUrl || null }),
    })
    const data = await res.json()
    if (res.ok) {
      setText(''); setImageUrl('')
      loadQuestions()
    } else {
      setError(data.error || 'Ошибка')
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-8 bg-[#121212] text-white">
      <SiteHeader />

      <main className="w-full max-w-3xl flex-grow">
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight">Спросить куратора</h1>
          <div className="h-px bg-white/20 flex-grow" />
        </div>

        {!loading && !user ? (
          <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-xl">
            <p className="text-gray-400 font-mono">Войдите для доступа</p>
          </div>
        ) : !userInfo?.isPremium ? (
          /* Not premium */
          <div className="bg-[#1a1a1a] border-2 border-yellow-400/20 rounded-2xl p-10 text-center">
            <div className="text-5xl mb-4">⭐</div>
            <h2 className="text-2xl font-bold uppercase tracking-tight mb-3">Доступно только Premium студентам</h2>
            <p className="text-gray-400 font-mono text-sm max-w-md mx-auto leading-relaxed">
              Функция «Спросить куратора» позволяет задавать вопросы напрямую преподавателю.
              Обратитесь к администратору для получения Premium-доступа.
            </p>
          </div>
        ) : (
          <>
            {/* Premium info bar */}
            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4 mb-6 flex items-center gap-4">
              <span className="text-2xl">⭐</span>
              <div>
                <span className="font-bold text-yellow-400">Premium</span>
                <span className="text-gray-400 font-mono text-sm ml-3">
                  Вопросов в этом месяце: {usedThisMonth} / {limit === 0 ? '∞' : limit}
                  {limit > 0 && <span className="ml-2 text-white">· Осталось: <strong>{remaining}</strong></span>}
                </span>
              </div>
            </div>

            {/* Ask form */}
            {canAsk ? (
              <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 mb-8 relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400 rounded-l-xl" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-5">Новый вопрос</h2>

                {/* Subject */}
                <div className="flex gap-2 mb-4">
                  {SUBJECTS.map(s => (
                    <button key={s} onClick={() => setSubject(s)}
                      className={`flex-1 py-2.5 rounded-lg border text-xs font-bold uppercase tracking-widest transition ${
                        subject === s ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                      }`}>
                      {s === 'Физика' ? '⚗️' : '📐'} {s}
                    </button>
                  ))}
                </div>

                {/* Text */}
                <textarea rows={5} value={text} onChange={e => setText(e.target.value)}
                  placeholder="Опишите свой вопрос подробно. Укажите тему, в чём именно возникло затруднение..."
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none resize-none mb-3"
                />

                {/* Image */}
                <div className="flex gap-2 mb-4">
                  <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                    placeholder="Фото условия / чертёж (необязательно)"
                    className="flex-grow bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none"
                  />
                  <button onClick={() => setFileOpen(true)}
                    className="bg-white/10 px-4 rounded-lg border border-white/20 hover:bg-yellow-400 hover:text-black transition">📁</button>
                </div>
                {imageUrl && (
                  <img src={imageUrl} alt="preview" className="max-h-40 rounded-lg border border-white/10 mb-4 object-contain bg-black/50" />
                )}

                {error && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm font-mono">{error}</div>
                )}

                <button onClick={handleSubmit} disabled={!text.trim() || submitting}
                  className="bg-yellow-400 text-black font-extrabold uppercase tracking-widest px-8 py-3 rounded-xl hover:bg-yellow-300 transition disabled:opacity-40">
                  {submitting ? 'Отправка...' : '📤 Задать вопрос'}
                </button>
              </div>
            ) : (
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-5 mb-8">
                <p className="text-orange-400 font-mono text-sm">
                  ⚠️ Вы исчерпали лимит вопросов на этот месяц ({limit} шт.). Лимит обновится в начале следующего месяца.
                </p>
              </div>
            )}

            {/* Questions history */}
            <div className="flex items-center gap-4 mb-5">
              <h2 className="text-xl font-bold uppercase tracking-widest">История вопросов</h2>
              <div className="h-px bg-white/10 flex-grow" />
            </div>

            {dataLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-xl text-gray-500 font-mono">
                Вопросов пока нет
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q: any) => {
                  const s = STATUS_CONFIG[q.status]
                  const isNew = q.status === 'answered'
                  return (
                    <div key={q.id} className={`bg-[#1a1a1a] rounded-xl border p-5 transition ${
                      isNew ? 'border-green-500/30' : 'border-white/10'
                    }`}>
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                          q.subject === 'Физика' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        }`}>
                          {q.subject}
                        </span>
                        {s && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${s.color}`}>
                            {s.icon} {s.label}
                          </span>
                        )}
                        <span className="ml-auto text-xs font-mono text-gray-500">
                          {new Date(q.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                        </span>
                      </div>

                      {/* Question */}
                      <p className="text-gray-300 font-mono text-sm leading-relaxed mb-2">{q.text}</p>
                      {q.imageUrl && (
                        <img src={q.imageUrl} alt="" className="max-h-40 rounded-lg border border-white/10 mb-3 object-contain bg-black/50" />
                      )}

                      {/* Answer */}
                      {q.answer && (
                        <div className="mt-4 bg-green-900/20 border border-green-500/20 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-green-400">Ответ куратора</span>
                            {q.curator && (
                              <span className="text-xs font-mono text-gray-500 ml-auto">
                                {q.curator.firstName ?? q.curator.username}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-300 font-mono text-sm leading-relaxed">{q.answer}</p>
                          {q.answerImageUrl && (
                            <img src={q.answerImageUrl} alt="" className="max-h-48 rounded-lg border border-white/10 mt-3 object-contain bg-black/50" />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>

      <FileManagerModal
        isOpen={fileOpen}
        onClose={() => setFileOpen(false)}
        onSelect={p => { setImageUrl(p); setFileOpen(false) }}
        baseFolder="courses"
      />
    </div>
  )
}