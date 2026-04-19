'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/hooks/useAuth'
import FileManagerModal from '@/app/components/admin/FileManagerModal'

interface ExamTask {
  id: number; number: number; part: number; text: string
  imageUrl?: string | null; pdfUrl?: string | null; answer?: string | null; maxScore: number; topic?: string | null
}

interface ExamAnswer { taskId: number; textAnswer?: string; imageUrl?: string }
interface ExamFeedback { taskId: number; isCorrect?: boolean | null; score?: number | null; comment?: string | null; imageUrl?: string | null }

export default function ExamSolvePage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [variant, setVariant] = useState<any>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<number, ExamAnswer>>({})
  const [attempt, setAttempt] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<any>(null)
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null)

  // File manager for photo upload (part 2)
  const [fileOpen, setFileOpen] = useState(false)
  const [fileTaskId, setFileTaskId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    const res = await fetch(`/api/exams/${id}?userId=${user.id}`)
    if (!res.ok) { setPageLoading(false); return }
    const data = await res.json()
    setVariant(data)
    setAttempt(data.attempt ?? null)

    // Restore saved answers
    if (data.attempt?.answers) {
      const map: Record<number, ExamAnswer> = {}
      for (const a of data.attempt.answers) {
        map[a.taskId] = { taskId: a.taskId, textAnswer: a.textAnswer ?? '', imageUrl: a.imageUrl ?? '' }
      }
      setAnswers(map)
    }
    setPageLoading(false)
  }, [id, user])

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading, load])

  const setAnswer = (taskId: number, field: 'textAnswer' | 'imageUrl', value: string) => {
    setAnswers(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], taskId, [field]: value },
    }))
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await fetch(`/api/exams/${id}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, answers, action: 'save' }),
    })
    setSaving(false)
  }

  const handleSubmit = async () => {
    if (!user) return
    if (!confirm('Отправить работу на проверку? Ответы в части 1 будут проверены автоматически, часть 2 — куратором.')) return
    setSubmitting(true)
    const res = await fetch(`/api/exams/${id}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, answers, action: 'submit' }),
    })
    const data = await res.json()
    if (data.success) {
      setSubmitResult(data)
      setAttempt(data.attempt)
    } else {
      alert(data.error || 'Ошибка')
    }
    setSubmitting(false)
  }

  const handleFileSelect = (path: string) => {
    if (fileTaskId) setAnswer(fileTaskId, 'imageUrl', path)
    setFileOpen(false)
    setFileTaskId(null)
  }

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white font-mono animate-pulse">
        ЗАГРУЗКА ВАРИАНТА...
      </div>
    )
  }

  if (!variant) {
    return <div className="min-h-screen bg-[#121212] flex items-center justify-center text-red-400">Вариант не найден</div>
  }

  const part1Tasks: ExamTask[] = variant.tasks?.filter((t: ExamTask) => t.part === 1) ?? []
  const part2Tasks: ExamTask[] = variant.tasks?.filter((t: ExamTask) => t.part === 2) ?? []
  const feedbackMap = new Map<number, ExamFeedback>(
    (attempt?.feedbacks ?? []).map((f: ExamFeedback) => [f.taskId, f])
  )

  const isSubmitted = ['submitted', 'reviewing', 'closed'].includes(attempt?.status)
  const isClosed = attempt?.status === 'closed'
  const isRevision = attempt?.status === 'revision'

  const statusConfig = {
    submitted: { label: '⏳ Работа отправлена, ожидает проверки куратора', color: 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400' },
    reviewing: { label: '🔍 Куратор проверяет вашу работу', color: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
    revision:  { label: '↩️ Куратор вернул работу на доработку', color: 'bg-orange-500/10 border-orange-500/30 text-orange-400' },
    closed:    { label: '✅ Проверка завершена', color: 'bg-green-500/10 border-green-500/30 text-green-400' },
  }
  const currentStatus = statusConfig[attempt?.status as keyof typeof statusConfig]

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link href="/exams" className="inline-block mb-8 text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-white transition border-b border-transparent hover:border-white pb-1">
          ← Все варианты
        </Link>

        {/* Header */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
              variant.subject === 'Физика' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            }`}>
              {variant.subject === 'Физика' ? '⚗️' : '📐'} {variant.subject} {variant.year && `· ${variant.year}`}
            </span>
            {variant.pdfUrl && (
              <a href={variant.pdfUrl} target="_blank" rel="noreferrer" download
                className="text-xs font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg hover:bg-blue-500/20 transition">
                📄 Скачать PDF варианта
              </a>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-yellow-400">{variant.title}</h1>
          <p className="text-gray-500 font-mono text-sm mt-1">
            Часть 1: {part1Tasks.length} заданий (автопроверка) ·
            Часть 2: {part2Tasks.length} заданий (проверка куратора)
          </p>
        </div>

        {/* Status banner */}
        {currentStatus && (
          <div className={`mb-8 p-4 rounded-xl border font-bold ${currentStatus.color}`}>
            {currentStatus.label}
            {isClosed && attempt?.totalScore != null && (
              <div className="mt-3 flex gap-4 flex-wrap text-sm font-mono">
                <span>Часть 1: <strong>{attempt.part1Score}</strong> / {part1Tasks.reduce((s: number, t: ExamTask) => s + t.maxScore, 0)} баллов</span>
                <span>Часть 2: <strong>{attempt.part2Score ?? '—'}</strong> / {part2Tasks.reduce((s: number, t: ExamTask) => s + t.maxScore, 0)} баллов</span>
                <span className="text-yellow-400">Итого: <strong>{attempt.totalScore}</strong> баллов</span>
              </div>
            )}
            {attempt?.curatorNote && (
              <p className="mt-2 text-sm font-normal opacity-80 border-t border-current/20 pt-2">{attempt.curatorNote}</p>
            )}
          </div>
        )}

        {/* Submit result (auto-check part 1) */}
        {submitResult && (
          <div className="mb-8 bg-green-900/20 border border-green-500/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-green-400 mb-3">✅ Работа отправлена на проверку!</h3>
            <p className="font-mono text-gray-300">
              Часть 1 проверена автоматически: <strong className="text-white">{submitResult.part1Score}</strong> / {submitResult.part1Total} баллов
              ({submitResult.autoChecked} заданий)
            </p>
            <p className="font-mono text-gray-400 text-sm mt-2">Часть 2 проверит куратор — вы получите уведомление.</p>
          </div>
        )}

        {/* ── PART 1 ────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-xl font-bold uppercase tracking-widest">⚡ Часть 1 — краткий ответ</h2>
            <div className="h-px bg-white/10 flex-grow" />
            <span className="text-xs font-mono text-gray-500">автопроверка</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {part1Tasks.map((task: ExamTask) => {
              const ans = answers[task.id]
              const fb = feedbackMap.get(task.id)
              const isCorrect = isClosed && fb?.isCorrect
              const isWrong = isClosed && fb?.isCorrect === false

              return (
                <div key={task.id} className={`bg-[#1a1a1a] rounded-xl p-5 border transition ${
                  isCorrect ? 'border-green-500/40' : isWrong ? 'border-red-500/40' : 'border-white/10'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl font-black text-white/20 select-none">#{task.number}</span>
                    {task.topic && <span className="text-xs font-mono text-gray-500">{task.topic}</span>}
                    <span className="ml-auto text-xs font-mono text-gray-500">{task.maxScore} балл</span>
                    {isCorrect && <span className="text-green-400 text-lg">✓</span>}
                    {isWrong && <span className="text-red-400 text-lg">✗</span>}
                  </div>
                  <p className="text-gray-300 font-mono text-sm mb-3 leading-relaxed">{task.text}</p>
                  {task.imageUrl && (
                    <img src={task.imageUrl} alt="" className="max-h-40 rounded-lg border border-white/10 mb-3 object-contain bg-black/50" />
                  )}
                  {task.pdfUrl && (
                    <a href={task.pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 font-mono hover:underline mb-3 block">📄 PDF к заданию</a>
                  )}
                  <input
                    type="text"
                    placeholder="Ответ..."
                    disabled={isSubmitted}
                    value={ans?.textAnswer ?? ''}
                    onChange={e => setAnswer(task.id, 'textAnswer', e.target.value)}
                    className={`w-full bg-black/40 border rounded p-3 font-mono text-sm focus:outline-none transition ${
                      isCorrect ? 'border-green-500/40 text-green-300' :
                      isWrong ? 'border-red-500/40 text-red-300' :
                      'border-white/10 text-white focus:border-yellow-400'
                    } disabled:opacity-60`}
                  />
                  {isWrong && task.answer && isClosed && (
                    <p className="text-xs font-mono text-green-400 mt-2">Правильный ответ: <strong>{task.answer}</strong></p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── PART 2 ────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-xl font-bold uppercase tracking-widest">✍️ Часть 2 — развёрнутый ответ</h2>
            <div className="h-px bg-white/10 flex-grow" />
            <span className="text-xs font-mono text-gray-500">проверка куратора</span>
          </div>

          <div className="space-y-5">
            {part2Tasks.map((task: ExamTask) => {
              const ans = answers[task.id]
              const fb = feedbackMap.get(task.id)

              return (
                <div key={task.id} className={`bg-[#1a1a1a] rounded-xl p-6 border ${
                  fb?.score != null ? 'border-blue-500/30' : 'border-white/10'
                }`}>
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-2xl font-black text-white/20 select-none">#{task.number}</span>
                    {task.topic && <span className="text-xs font-mono text-gray-500">{task.topic}</span>}
                    <span className="ml-auto text-xs font-mono text-gray-500">
                      макс. {task.maxScore} балл{task.maxScore > 1 ? 'а' : ''}
                    </span>
                    {fb?.score != null && (
                      <span className="text-sm font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg">
                        Получено: {fb.score} / {task.maxScore}
                      </span>
                    )}
                  </div>

                  <p className="text-gray-300 font-mono text-sm mb-4 leading-relaxed">{task.text}</p>
                  {task.imageUrl && (
                    <img src={task.imageUrl} alt="" className="max-h-64 rounded-lg border border-white/10 mb-4 object-contain bg-black/50" />
                  )}
                  {task.pdfUrl && (
                    <a href={task.pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 font-mono hover:underline mb-4 block">📄 PDF к заданию</a>
                  )}

                  {/* Student answer */}
                  <div className="space-y-3">
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-widest block">Ваш ответ (текст):</label>
                    <textarea
                      rows={3}
                      disabled={isSubmitted}
                      value={ans?.textAnswer ?? ''}
                      onChange={e => setAnswer(task.id, 'textAnswer', e.target.value)}
                      placeholder="Запишите ход решения..."
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none resize-none disabled:opacity-60 transition"
                    />

                    <label className="text-xs font-mono text-gray-400 uppercase tracking-widest block">Фото решения:</label>
                    {!isSubmitted ? (
                      <div className="flex gap-2">
                        <input
                          value={ans?.imageUrl ?? ''}
                          onChange={e => setAnswer(task.id, 'imageUrl', e.target.value)}
                          placeholder="URL фото или загрузите через менеджер"
                          className="flex-grow bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none"
                        />
                        <button onClick={() => { setFileTaskId(task.id); setFileOpen(true) }}
                          className="bg-white/10 px-4 rounded-lg border border-white/20 hover:bg-yellow-400 hover:text-black transition">📁</button>
                      </div>
                    ) : null}
                    {ans?.imageUrl && (
                      <img src={ans.imageUrl} alt="Решение" className="max-h-64 rounded-lg border border-white/10 object-contain bg-black/50" />
                    )}

                    {/* Curator feedback */}
                    {fb && (
                      <div className={`rounded-xl p-4 border mt-3 ${
                        fb.score === task.maxScore ? 'bg-green-900/20 border-green-500/30'
                        : (fb.score ?? 0) > 0 ? 'bg-blue-900/20 border-blue-500/30'
                        : 'bg-red-900/20 border-red-500/30'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Комментарий куратора</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ml-auto ${
                            fb.score === task.maxScore ? 'text-green-400 bg-green-500/10 border-green-500/20'
                            : (fb.score ?? 0) > 0 ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                            : 'text-red-400 bg-red-500/10 border-red-500/20'
                          }`}>
                            {fb.score ?? 0} / {task.maxScore} балл{task.maxScore > 1 ? 'а' : ''}
                          </span>
                        </div>
                        {fb.comment && <p className="text-gray-300 text-sm font-mono">{fb.comment}</p>}
                        {fb.imageUrl && (
                          <img src={fb.imageUrl} alt="Пометки куратора" className="max-h-64 rounded-lg border border-white/10 mt-3 object-contain bg-black/50" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        {!isSubmitted && (
          <div className="flex gap-4 justify-end sticky bottom-6">
            <button onClick={handleSave} disabled={saving}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold uppercase tracking-widest text-sm px-6 py-3 rounded-xl transition disabled:opacity-40">
              {saving ? 'Сохранение...' : '💾 Сохранить черновик'}
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="bg-yellow-400 text-black font-extrabold uppercase tracking-widest text-sm px-8 py-3 rounded-xl hover:bg-yellow-300 transition disabled:opacity-40">
              {submitting ? 'Отправка...' : '📤 Сдать на проверку'}
            </button>
          </div>
        )}

        {isRevision && (
          <div className="flex justify-end sticky bottom-6">
            <button onClick={handleSubmit} disabled={submitting}
              className="bg-orange-500 text-white font-extrabold uppercase tracking-widest text-sm px-8 py-3 rounded-xl hover:bg-orange-400 transition disabled:opacity-40">
              {submitting ? 'Отправка...' : '↩️ Отправить исправленную работу'}
            </button>
          </div>
        )}
      </div>

      <FileManagerModal
        isOpen={fileOpen}
        onClose={() => setFileOpen(false)}
        onSelect={handleFileSelect}
        baseFolder="courses"
      />
    </div>
  )
}