'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import FileManagerModal from '@/app/components/admin/FileManagerModal'

const PART_LABELS: Record<number, string> = {
  1: 'Часть 1 (краткий ответ, автопроверка)',
  2: 'Часть 2 (развёрнутый ответ, ручная проверка)',
}

export default function AdminExamEditorPage() {
  const { id } = useParams()
  const [variant, setVariant] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // New task form
  const [newTask, setNewTask] = useState({
    number: '', part: 1, text: '', imageUrl: '', pdfUrl: '', answer: '', maxScore: 1, topic: '',
  })
  const [saving, setSaving] = useState(false)

  // Edit task
  const [editTask, setEditTask] = useState<any>(null)

  // File manager
  const [fileTarget, setFileTarget] = useState<'newImage' | 'newPdf' | 'editImage' | 'editPdf' | null>(null)
  const [fileOpen, setFileOpen] = useState(false)

  const load = async () => {
    const res = await fetch(`/api/admin/exams/${id}`)
    if (res.ok) setVariant(await res.json())
    setLoading(false)
  }

  useEffect(() => { if (id) load() }, [id])

  const handleFileSelect = (path: string) => {
    if (fileTarget === 'newImage') setNewTask(p => ({ ...p, imageUrl: path }))
    if (fileTarget === 'newPdf') setNewTask(p => ({ ...p, pdfUrl: path }))
    if (fileTarget === 'editImage') setEditTask((p: any) => p ? { ...p, imageUrl: path } : p)
    if (fileTarget === 'editPdf') setEditTask((p: any) => p ? { ...p, pdfUrl: path } : p)
    setFileOpen(false)
  }

  const handleAddTask = async () => {
    if (!newTask.text.trim() || !newTask.number) return
    setSaving(true)
    await fetch(`/api/admin/exams/${id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    })
    setNewTask({ number: '', part: 1, text: '', imageUrl: '', pdfUrl: '', answer: '', maxScore: 1, topic: '' })
    setSaving(false)
    load()
  }

  const handleSaveTask = async () => {
    if (!editTask) return
    await fetch(`/api/admin/exams/tasks/${editTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editTask),
    })
    setEditTask(null)
    load()
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Удалить задание?')) return
    await fetch(`/api/admin/exams/tasks/${taskId}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="text-white font-mono animate-pulse py-10 text-center">Загрузка...</div>
  if (!variant) return <div className="text-red-400 py-10">Вариант не найден</div>

  const part1Tasks = variant.tasks?.filter((t: any) => t.part === 1) ?? []
  const part2Tasks = variant.tasks?.filter((t: any) => t.part === 2) ?? []

  return (
    <div>
      <Link href="/admin/exams" className="inline-block mb-8 text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-white transition border-b border-transparent hover:border-white pb-1">
        ← Назад к списку вариантов
      </Link>

      {/* Header */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
            variant.subject === 'Физика' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
          }`}>
            {variant.subject === 'Физика' ? '⚗️' : '📐'} {variant.subject} {variant.year && `· ${variant.year}`}
          </span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
            variant.isPublished ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-gray-500/20 border-gray-500/30 text-gray-400'
          }`}>
            {variant.isPublished ? '✓ Опубликован' : 'Черновик'}
          </span>
        </div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-yellow-400">{variant.title}</h1>
        <p className="text-gray-500 font-mono text-sm mt-1">
          Заданий: {variant.tasks?.length ?? 0} (часть 1: {part1Tasks.length}, часть 2: {part2Tasks.length})
          {variant.pdfUrl && <span className="ml-4 text-blue-400">📄 PDF варианта прикреплён</span>}
        </p>
      </div>

      {/* Add task form */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 mb-8 relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400 rounded-l-xl" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-5">Добавить задание</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {/* Part selector */}
          <div className="flex gap-2 col-span-full">
            {[1, 2].map(p => (
              <button key={p} onClick={() => setNewTask(prev => ({ ...prev, part: p }))}
                className={`flex-1 py-2.5 rounded-lg border text-xs font-bold uppercase tracking-widest transition ${
                  newTask.part === p ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                }`}>
                {p === 1 ? '⚡ Часть 1 (автопроверка)' : '✍️ Часть 2 (ручная проверка)'}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <input type="number" min="1" max="30" placeholder="№" value={newTask.number}
              onChange={e => setNewTask(p => ({ ...p, number: e.target.value }))}
              className="w-20 bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none text-center"
            />
            <input placeholder="Тема (необязательно)" value={newTask.topic}
              onChange={e => setNewTask(p => ({ ...p, topic: e.target.value }))}
              className="flex-grow bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none"
            />
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs font-mono text-gray-500 whitespace-nowrap">Макс. баллов:</span>
            <input type="number" min="1" max="10" value={newTask.maxScore}
              onChange={e => setNewTask(p => ({ ...p, maxScore: parseInt(e.target.value) || 1 }))}
              className="w-16 bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none text-center"
            />
          </div>
          {/* Task text */}
          <textarea placeholder="Текст задания..." value={newTask.text}
            onChange={e => setNewTask(p => ({ ...p, text: e.target.value }))}
            rows={3}
            className="col-span-full bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none resize-none"
          />
          {/* Image */}
          <div className="flex gap-2">
            <input placeholder="URL картинки к заданию" value={newTask.imageUrl}
              onChange={e => setNewTask(p => ({ ...p, imageUrl: e.target.value }))}
              className="flex-grow bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none"
            />
            <button onClick={() => { setFileTarget('newImage'); setFileOpen(true) }}
              className="bg-white/10 px-3 rounded-lg border border-white/20 hover:bg-yellow-400 hover:text-black transition">📁</button>
          </div>
          {/* PDF for task */}
          <div className="flex gap-2">
            <input placeholder="PDF к заданию (необязательно)" value={newTask.pdfUrl}
              onChange={e => setNewTask(p => ({ ...p, pdfUrl: e.target.value }))}
              className="flex-grow bg-black/40 border border-blue-500/20 rounded-lg p-3 text-white font-mono text-sm focus:border-blue-400 focus:outline-none"
            />
            <button onClick={() => { setFileTarget('newPdf'); setFileOpen(true) }}
              className="bg-blue-500/20 px-3 rounded-lg border border-blue-500/30 hover:bg-blue-500/40 transition">📄</button>
          </div>
          {/* Answer — only for part 1 */}
          {newTask.part === 1 && (
            <input placeholder="Правильный ответ (для автопроверки)" value={newTask.answer}
              onChange={e => setNewTask(p => ({ ...p, answer: e.target.value }))}
              className="col-span-full bg-black/40 border border-green-500/30 rounded-lg p-3 text-white font-mono text-sm focus:border-green-400 focus:outline-none"
            />
          )}
        </div>
        <button onClick={handleAddTask} disabled={!newTask.text.trim() || !newTask.number || saving}
          className="bg-white text-black font-extrabold uppercase tracking-widest text-xs px-6 py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-40">
          {saving ? '...' : '+ Добавить задание'}
        </button>
      </div>

      {/* Tasks display */}
      {[1, 2].map(part => {
        const tasks = part === 1 ? part1Tasks : part2Tasks
        return (
          <div key={part} className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-bold uppercase tracking-widest">
                {part === 1 ? '⚡ Часть 1 — краткий ответ' : '✍️ Часть 2 — развёрнутый ответ'}
              </h2>
              <div className="h-px bg-white/10 flex-grow" />
              <span className="text-xs font-mono text-gray-500">{tasks.length} заданий</span>
            </div>

            {tasks.length === 0 ? (
              <p className="text-gray-600 font-mono text-sm italic text-center py-6 border border-dashed border-white/5 rounded-xl">
                Нет заданий
              </p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task: any) => (
                  <div key={task.id} className={`bg-[#1a1a1a] rounded-xl p-5 border ${
                    part === 1 ? 'border-white/10' : 'border-purple-500/20'
                  }`}>
                    {editTask?.id === task.id ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-3">
                          <input type="number" min="1" max="30" value={editTask.number}
                            onChange={e => setEditTask((p: any) => ({ ...p, number: e.target.value }))}
                            className="w-16 bg-black/40 border border-yellow-400 rounded p-2 text-white font-mono text-sm focus:outline-none text-center"
                          />
                          <input value={editTask.topic || ''} placeholder="Тема"
                            onChange={e => setEditTask((p: any) => ({ ...p, topic: e.target.value }))}
                            className="flex-grow bg-black/40 border border-white/10 rounded p-2 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none"
                          />
                          <input type="number" min="1" max="10" value={editTask.maxScore}
                            onChange={e => setEditTask((p: any) => ({ ...p, maxScore: parseInt(e.target.value) || 1 }))}
                            className="w-16 bg-black/40 border border-white/10 rounded p-2 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none text-center"
                          />
                        </div>
                        <textarea value={editTask.text} rows={3}
                          onChange={e => setEditTask((p: any) => ({ ...p, text: e.target.value }))}
                          className="bg-black/40 border border-yellow-400 rounded p-2 text-white font-mono text-sm focus:outline-none resize-none"
                        />
                        <div className="flex gap-2">
                          <input value={editTask.imageUrl || ''} placeholder="URL картинки"
                            onChange={e => setEditTask((p: any) => ({ ...p, imageUrl: e.target.value }))}
                            className="flex-grow bg-black/40 border border-white/10 rounded p-2 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none"
                          />
                          <button onClick={() => { setFileTarget('editImage'); setFileOpen(true) }}
                            className="bg-white/10 px-3 rounded border border-white/20 hover:bg-yellow-400 hover:text-black transition">📁</button>
                        </div>
                        {task.part === 1 && (
                          <input value={editTask.answer || ''} placeholder="Правильный ответ"
                            onChange={e => setEditTask((p: any) => ({ ...p, answer: e.target.value }))}
                            className="bg-black/40 border border-green-500/30 rounded p-2 text-white font-mono text-sm focus:border-green-400 focus:outline-none"
                          />
                        )}
                        <div className="flex gap-2">
                          <button onClick={handleSaveTask}
                            className="bg-yellow-400 text-black font-bold px-4 py-2 rounded hover:bg-yellow-300 transition text-sm">✓ Сохранить</button>
                          <button onClick={() => setEditTask(null)}
                            className="text-gray-500 hover:text-white px-3 py-2 transition text-sm">Отмена</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-white/20 select-none">#{task.number}</span>
                            <div>
                              {task.topic && <span className="text-xs font-mono text-gray-500 block">{task.topic}</span>}
                              <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                                task.part === 1 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              }`}>
                                {task.maxScore} балл{task.maxScore > 1 ? 'а' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => setEditTask({ ...task })}
                              className="text-gray-500 hover:text-yellow-400 transition px-2 py-1 rounded hover:bg-white/5 text-sm">✏️</button>
                            <button onClick={() => handleDeleteTask(task.id)}
                              className="text-gray-500 hover:text-red-400 transition px-2 py-1 rounded hover:bg-white/5 text-sm">🗑️</button>
                          </div>
                        </div>
                        <p className="text-gray-300 font-mono text-sm mb-3 leading-relaxed">{task.text}</p>
                        {task.imageUrl && (
                          <img src={task.imageUrl} alt="" className="max-h-48 rounded-lg border border-white/10 mb-3 object-contain bg-black/50" />
                        )}
                        <div className="flex gap-4 flex-wrap">
                          {task.part === 1 && task.answer && (
                            <span className="text-xs font-mono bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-lg">
                              ✓ Ответ: <strong>{task.answer}</strong>
                            </span>
                          )}
                          {task.pdfUrl && (
                            <span className="text-xs font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg">📄 PDF</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <FileManagerModal
        isOpen={fileOpen}
        onClose={() => setFileOpen(false)}
        onSelect={handleFileSelect}
        baseFolder="courses"
      />
    </div>
  )
}