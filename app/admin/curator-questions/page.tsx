'use client'
import { useState, useEffect } from 'react'
import FileManagerModal from '@/app/components/admin/FileManagerModal'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open:     { label: 'Ожидает ответа', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  answered: { label: 'Отвечен',        color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  closed:   { label: 'Закрыт',         color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' },
}

export default function AdminCuratorQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [answer, setAnswer] = useState('')
  const [answerImageUrl, setAnswerImageUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [fileOpen, setFileOpen] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/curator-questions?mode=queue')
      .then(r => r.json())
      .then(d => { setQuestions(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAnswer = async (id: number) => {
    if (!answer.trim()) return
    setSaving(true)
    const res = await fetch(`/api/curator-questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'answer', answer, answerImageUrl: answerImageUrl || null }),
    })
    if (res.ok) {
      setActiveId(null)
      setAnswer('')
      setAnswerImageUrl('')
      load()
    }
    setSaving(false)
  }

  const handleClose = async (id: number) => {
    if (!confirm('Закрыть вопрос?')) return
    await fetch(`/api/curator-questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close' }),
    })
    load()
  }

  const openQuestion = questions.filter(q => q.status === 'open')
  const answeredQuestion = questions.filter(q => q.status === 'answered')

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">Вопросы студентов</h1>
        <div className="h-px bg-white/20 flex-grow" />
        {openQuestion.length > 0 && (
          <span className="bg-yellow-400 text-black font-bold font-mono px-3 py-1 rounded text-sm">
            {openQuestion.length} новых
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-white font-mono animate-pulse text-center py-20">Загрузка...</div>
      ) : questions.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-xl">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-gray-400 font-mono">Нет вопросов на рассмотрении</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Open questions first */}
          {openQuestion.length > 0 && (
            <>
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mt-2 mb-3">
                Ожидают ответа ({openQuestion.length})
              </h2>
              {openQuestion.map(q => <QuestionCard key={q.id} q={q} activeId={activeId} setActiveId={setActiveId} answer={answer} setAnswer={setAnswer} answerImageUrl={answerImageUrl} setAnswerImageUrl={setAnswerImageUrl} saving={saving} onAnswer={handleAnswer} onClose={handleClose} onFileOpen={() => setFileOpen(true)} />)}
            </>
          )}

          {answeredQuestion.length > 0 && (
            <>
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mt-6 mb-3">
                Отвечены ({answeredQuestion.length})
              </h2>
              {answeredQuestion.map(q => <QuestionCard key={q.id} q={q} activeId={activeId} setActiveId={setActiveId} answer={answer} setAnswer={setAnswer} answerImageUrl={answerImageUrl} setAnswerImageUrl={setAnswerImageUrl} saving={saving} onAnswer={handleAnswer} onClose={handleClose} onFileOpen={() => setFileOpen(true)} />)}
            </>
          )}
        </div>
      )}

      <FileManagerModal
        isOpen={fileOpen}
        onClose={() => setFileOpen(false)}
        onSelect={p => { setAnswerImageUrl(p); setFileOpen(false) }}
        baseFolder="courses"
      />
    </div>
  )
}

function QuestionCard({ q, activeId, setActiveId, answer, setAnswer, answerImageUrl, setAnswerImageUrl, saving, onAnswer, onClose, onFileOpen }: any) {
  const s = STATUS_CONFIG[q.status]
  const isActive = activeId === q.id

  return (
    <div className={`bg-[#1a1a1a] rounded-xl border p-5 transition ${
      q.status === 'open' ? 'border-yellow-400/20' : 'border-white/10'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <img
          src={q.student?.photoUrl ?? `https://ui-avatars.com/api/?name=${q.student?.firstName ?? 'S'}&background=random`}
          alt="" className="w-9 h-9 rounded-full border border-white/10 flex-shrink-0"
        />
        <div className="flex-grow min-w-0">
          <span className="font-bold text-sm text-white">{q.student?.firstName ?? q.student?.username ?? '?'}</span>
          {q.student?.username && <span className="text-xs text-gray-500 font-mono ml-2">@{q.student.username}</span>}
        </div>
        <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
          q.subject === 'Физика' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
        }`}>
          {q.subject}
        </span>
        {s && <span className={`text-xs font-bold px-2 py-0.5 rounded border ${s.color}`}>{s.label}</span>}
        <span className="text-xs font-mono text-gray-500">
          {new Date(q.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Question text */}
      <p className="text-gray-300 font-mono text-sm leading-relaxed mb-3">{q.text}</p>
      {q.imageUrl && (
        <img src={q.imageUrl} alt="" className="max-h-48 rounded-lg border border-white/10 mb-3 object-contain bg-black/50" />
      )}

      {/* Existing answer */}
      {q.answer && (
        <div className="bg-green-900/20 border border-green-500/20 rounded-xl p-4 mb-3">
          <span className="text-xs font-bold text-green-400 uppercase tracking-widest block mb-2">Ваш ответ:</span>
          <p className="text-gray-300 font-mono text-sm leading-relaxed">{q.answer}</p>
          {q.answerImageUrl && (
            <img src={q.answerImageUrl} alt="" className="max-h-40 rounded-lg border border-white/10 mt-2 object-contain bg-black/50" />
          )}
        </div>
      )}

      {/* Action buttons */}
      {q.status === 'open' && !isActive && (
        <button
          onClick={() => setActiveId(q.id)}
          className="text-xs font-bold uppercase tracking-widest bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 border border-yellow-400/30 px-5 py-2 rounded-lg transition"
        >
          ✍️ Ответить
        </button>
      )}

      {q.status === 'answered' && (
        <button
          onClick={() => onClose(q.id)}
          className="text-xs font-bold uppercase tracking-widest bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 border border-gray-500/20 px-4 py-2 rounded-lg transition"
        >
          🔒 Закрыть вопрос
        </button>
      )}

      {/* Answer form */}
      {isActive && (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest block">Ваш ответ:</span>
          <textarea
            rows={5}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Подробно объясните решение, укажите на ошибки или дайте рекомендации..."
            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <input
              value={answerImageUrl}
              onChange={e => setAnswerImageUrl(e.target.value)}
              placeholder="Фото с решением / пояснением (необязательно)"
              className="flex-grow bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none"
            />
            <button onClick={onFileOpen}
              className="bg-white/10 px-4 rounded-lg border border-white/20 hover:bg-yellow-400 hover:text-black transition">📁</button>
          </div>
          {answerImageUrl && (
            <img src={answerImageUrl} alt="preview" className="max-h-32 rounded-lg border border-white/10 object-contain bg-black/50" />
          )}
          <div className="flex gap-3">
            <button
              onClick={() => onAnswer(q.id)}
              disabled={!answer.trim() || saving}
              className="bg-green-600 hover:bg-green-500 text-white font-extrabold uppercase tracking-widest text-xs px-6 py-2.5 rounded-lg transition disabled:opacity-40"
            >
              {saving ? '...' : '✅ Отправить ответ'}
            </button>
            <button
              onClick={() => { setActiveId(null); setAnswer(''); setAnswerImageUrl('') }}
              className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 transition"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}