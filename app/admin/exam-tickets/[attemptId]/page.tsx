'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import FileManagerModal from '@/app/components/admin/FileManagerModal'

export default function AdminExamTicketReviewPage() {
  const { attemptId } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [feedbacks, setFeedbacks] = useState<Record<number, any>>({})
  const [curatorNote, setCuratorNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [fileOpen, setFileOpen] = useState(false)
  const [fileTaskId, setFileTaskId] = useState<number | null>(null)

  const load = async () => {
    const res = await fetch(`/api/admin/exam-tickets/${attemptId}`)
    if (res.ok) {
      const d = await res.json()
      setData(d)
      setCuratorNote(d.curatorNote ?? '')
      // Init feedbacks from existing
      const fbMap: Record<number, any> = {}
      for (const fb of d.feedbacks ?? []) {
        fbMap[fb.taskId] = { ...fb }
      }
      setFeedbacks(fbMap)
    }
    setLoading(false)
  }

  useEffect(() => { if (attemptId) load() }, [attemptId])

  const setFb = (taskId: number, field: string, value: any) => {
    setFeedbacks(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], taskId, [field]: value },
    }))
  }

  const handleTake = async () => {
    await fetch(`/api/admin/exam-tickets/${attemptId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'take' }),
    })
    load()
  }

  const handleSaveFeedback = async () => {
    setSaving(true)
    const fbList = Object.values(feedbacks)
    await fetch(`/api/admin/exam-tickets/${attemptId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_feedback', feedbacks: fbList, curatorNote }),
    })
    setSaving(false)
    load()
  }

  const handleRevision = async () => {
    if (!curatorNote.trim()) { alert('Укажите комментарий для студента перед отправкой на доработку'); return }
    await fetch(`/api/admin/exam-tickets/${attemptId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send_revision', curatorNote }),
    })
    router.push('/admin/exam-tickets')
  }

  const handleClose = async () => {
    if (!confirm('Завершить проверку? Студент увидит финальный результат.')) return
    await fetch(`/api/admin/exam-tickets/${attemptId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close', curatorNote }),
    })
    router.push('/admin/exam-tickets')
  }

  const handleFileSelect = (path: string) => {
    if (fileTaskId) setFb(fileTaskId, 'imageUrl', path)
    setFileOpen(false)
    setFileTaskId(null)
  }

  if (loading) return <div className="text-white font-mono animate-pulse py-20 text-center">Загрузка...</div>
  if (!data) return <div className="text-red-400 py-10">Тикет не найден</div>

  const part1Tasks = data.variant?.tasks?.filter((t: any) => t.part === 1) ?? []
  const part2Tasks = data.variant?.tasks?.filter((t: any) => t.part === 2) ?? []
  const answerMap = new Map((data.answers ?? []).map((a: any) => [a.taskId, a]))

  const isReviewing = data.status === 'reviewing'
  const canEdit = ['submitted', 'reviewing'].includes(data.status)

  return (
    <div>
      <Link href="/admin/exam-tickets" className="inline-block mb-8 text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-white transition border-b border-transparent hover:border-white pb-1">
        ← Все тикеты
      </Link>

      {/* Header */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 mb-8 flex items-center gap-5">
        <img src={data.student.photoUrl ?? `https://ui-avatars.com/api/?name=${data.student.firstName ?? 'S'}&background=random`}
          alt="" className="w-14 h-14 rounded-full border border-white/10 flex-shrink-0" />
        <div className="flex-grow">
          <h1 className="text-2xl font-extrabold text-white">
            {data.student.firstName ?? data.student.username ?? '?'}
          </h1>
          <p className="text-gray-400 font-mono text-sm">{data.variant.title}</p>
          <div className="flex gap-3 mt-2 flex-wrap text-xs font-mono">
            <span className="text-gray-500">Ч1: <span className="text-white">{data.part1Score ?? '—'}</span></span>
            <span className="text-gray-500">Ч2: <span className="text-white">{data.part2Score ?? '—'}</span></span>
            <span className="text-yellow-400 font-bold">Итого: {data.totalScore ?? '—'}</span>
          </div>
        </div>
        {data.status === 'submitted' && (
          <button onClick={handleTake}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest text-xs px-5 py-2.5 rounded-lg transition">
            Взять в работу
          </button>
        )}
      </div>

      {/* Part 1 — read-only with auto results */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-bold uppercase tracking-widest">⚡ Часть 1 — авторезультаты</h2>
          <div className="h-px bg-white/10 flex-grow" />
          <span className="text-xs font-mono text-gray-500">автопроверено · {data.part1Score ?? 0} / {part1Tasks.reduce((s: number, t: any) => s + t.maxScore, 0)} баллов</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {part1Tasks.map((task: any) => {
            const ans = answerMap.get(task.id) as any
            const correct = ans?.textAnswer?.trim().toLowerCase() === task.answer?.trim().toLowerCase()
            return (
              <div key={task.id} className={`bg-[#1a1a1a] rounded-xl p-4 border ${
                correct ? 'border-green-500/30' : 'border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-black text-white/20">#{task.number}</span>
                  {task.topic && <span className="text-xs font-mono text-gray-500">{task.topic}</span>}
                  <span className="ml-auto">{correct ? '✅' : '❌'}</span>
                </div>
                <p className="text-gray-400 font-mono text-xs mb-2">{task.text}</p>
                <div className="flex gap-3 text-xs font-mono">
                  <span className="text-gray-400">Ответ студента: <span className={correct ? 'text-green-400' : 'text-red-400'}>{ans?.textAnswer || '—'}</span></span>
                  {!correct && <span className="text-green-400">Правильно: {task.answer}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Part 2 — curator review */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-bold uppercase tracking-widest">✍️ Часть 2 — проверка</h2>
          <div className="h-px bg-white/10 flex-grow" />
        </div>
        <div className="space-y-5">
          {part2Tasks.map((task: any) => {
            const ans = answerMap.get(task.id) as any
            const fb = feedbacks[task.id] ?? {}
            return (
              <div key={task.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl font-black text-white/20">#{task.number}</span>
                  {task.topic && <span className="text-xs font-mono text-gray-500">{task.topic}</span>}
                  <span className="ml-auto text-xs font-mono text-gray-500">макс. {task.maxScore} балл</span>
                </div>
                <p className="text-gray-300 font-mono text-sm mb-4 leading-relaxed">{task.text}</p>

                {/* Student answer */}
                <div className="bg-black/30 border border-white/5 rounded-xl p-4 mb-4">
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">Ответ студента:</span>
                  {ans?.textAnswer && <p className="text-gray-300 font-mono text-sm mb-3 leading-relaxed">{ans.textAnswer}</p>}
                  {ans?.imageUrl && (
                    <img src={ans.imageUrl} alt="Решение студента"
                      className="max-h-80 rounded-lg border border-white/10 object-contain bg-black/50" />
                  )}
                  {!ans?.textAnswer && !ans?.imageUrl && (
                    <p className="text-gray-600 font-mono text-sm italic">Студент не дал ответа</p>
                  )}
                </div>

                {/* Curator feedback form */}
                {canEdit && (
                  <div className="space-y-3">
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-widest block">Ваша оценка:</span>
                    <div className="flex gap-3 items-center">
                      {/* Score */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">Баллов:</span>
                        <input type="number" min="0" max={task.maxScore}
                          value={fb.score ?? ''}
                          onChange={e => setFb(task.id, 'score', parseInt(e.target.value) || 0)}
                          className="w-16 bg-black/40 border border-white/10 rounded p-2 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none text-center"
                        />
                        <span className="text-xs font-mono text-gray-500">/ {task.maxScore}</span>
                      </div>
                      {/* Quick buttons */}
                      <button onClick={() => setFb(task.id, 'score', task.maxScore)}
                        className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg hover:bg-green-500/30 transition font-bold">
                        Полный балл
                      </button>
                      <button onClick={() => setFb(task.id, 'score', 0)}
                        className="text-xs bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/30 transition font-bold">
                        0
                      </button>
                    </div>
                    {/* Comment */}
                    <textarea rows={2} value={fb.comment ?? ''}
                      onChange={e => setFb(task.id, 'comment', e.target.value)}
                      placeholder="Комментарий к заданию (необязательно)..."
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none resize-none"
                    />
                    {/* Feedback image */}
                    <div className="flex gap-2">
                      <input value={fb.imageUrl ?? ''} onChange={e => setFb(task.id, 'imageUrl', e.target.value)}
                        placeholder="Фото с пометками куратора (необязательно)"
                        className="flex-grow bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none"
                      />
                      <button onClick={() => { setFileTaskId(task.id); setFileOpen(true) }}
                        className="bg-white/10 px-3 rounded-lg border border-white/20 hover:bg-yellow-400 hover:text-black transition">📁</button>
                    </div>
                    {fb.imageUrl && (
                      <img src={fb.imageUrl} alt="preview" className="max-h-32 rounded-lg border border-white/10 object-contain" />
                    )}
                  </div>
                )}

                {/* Saved feedback (read-only) */}
                {!canEdit && (data.feedbacks ?? []).find((f: any) => f.taskId === task.id) && (() => {
                  const savedFb = (data.feedbacks ?? []).find((f: any) => f.taskId === task.id)
                  return (
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                      <span className="text-xs font-mono text-blue-400 font-bold">Оценка куратора: {savedFb.score} / {task.maxScore}</span>
                      {savedFb.comment && <p className="text-gray-300 text-sm mt-1">{savedFb.comment}</p>}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>

      {/* Curator note + actions */}
      {canEdit && (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 sticky bottom-6">
          <label className="text-xs font-mono text-gray-400 uppercase tracking-widest block mb-2">Общий комментарий для студента:</label>
          <textarea rows={2} value={curatorNote} onChange={e => setCuratorNote(e.target.value)}
            placeholder="Общее впечатление о работе, рекомендации..."
            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none resize-none mb-4"
          />
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleSaveFeedback} disabled={saving}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold uppercase tracking-widest text-xs px-5 py-2.5 rounded-lg transition disabled:opacity-40">
              {saving ? '...' : '💾 Сохранить оценки'}
            </button>
            <button onClick={handleRevision}
              className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400 font-bold uppercase tracking-widest text-xs px-5 py-2.5 rounded-lg transition">
              ↩️ На доработку
            </button>
            <button onClick={handleClose}
              className="bg-green-600 hover:bg-green-500 text-white font-extrabold uppercase tracking-widest text-xs px-6 py-2.5 rounded-lg transition ml-auto">
              ✅ Завершить проверку
            </button>
          </div>
        </div>
      )}

      <FileManagerModal
        isOpen={fileOpen}
        onClose={() => setFileOpen(false)}
        onSelect={handleFileSelect}
        baseFolder="courses"
      />
    </div>
  )
}