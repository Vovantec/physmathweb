'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import FileManagerModal from '@/app/components/admin/FileManagerModal'

export default function CourseManagerPage() {
  const { id } = useParams()
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Create forms
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newLesson, setNewLesson] = useState({ title: '', videoUrl: '', taskId: 0 })
  const [newQuestion, setNewQuestion] = useState({ type: 'value', content: '', answer: '', videoUrl: '', imageUrl: '', lessonId: 0 })

  // Edit states
  const [editTask, setEditTask] = useState<{ id: number; title: string } | null>(null)
  const [editLesson, setEditLesson] = useState<{ id: number; title: string; videoUrl: string } | null>(null)
  const [editQuestion, setEditQuestion] = useState<{ id: number; type: string; content: string; answer: string; videoUrl: string; imageUrl: string } | null>(null)

  // File manager
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false)
  const [currentFileTarget, setCurrentFileTarget] = useState<'questionVideo' | 'questionImage' | 'lessonVideo' | 'editLessonVideo' | 'editQuestionVideo' | 'editQuestionImage' | null>(null)

  const handleOpenManager = (target: typeof currentFileTarget, contextId: number) => {
    if (target === 'lessonVideo') {
      setNewLesson(prev => prev.taskId === contextId ? { ...prev } : { title: '', videoUrl: '', taskId: contextId })
    } else if (target === 'questionVideo' || target === 'questionImage') {
      setNewQuestion(prev => prev.lessonId === contextId ? { ...prev } : { type: 'value', content: '', answer: '', videoUrl: '', imageUrl: '', lessonId: contextId })
    }
    setCurrentFileTarget(target)
    setIsFileManagerOpen(true)
  }

  const handleSelectFile = (path: string) => {
    if (currentFileTarget === 'lessonVideo') setNewLesson(prev => ({ ...prev, videoUrl: path }))
    else if (currentFileTarget === 'questionVideo') setNewQuestion(prev => ({ ...prev, videoUrl: path }))
    else if (currentFileTarget === 'questionImage') setNewQuestion(prev => ({ ...prev, imageUrl: path }))
    else if (currentFileTarget === 'editLessonVideo') setEditLesson(prev => prev ? { ...prev, videoUrl: path } : prev)
    else if (currentFileTarget === 'editQuestionVideo') setEditQuestion(prev => prev ? { ...prev, videoUrl: path } : prev)
    else if (currentFileTarget === 'editQuestionImage') setEditQuestion(prev => prev ? { ...prev, imageUrl: path } : prev)
    setIsFileManagerOpen(false)
  }

  const fetchCourseData = async () => {
    const res = await fetch(`/api/admin/courses/${id}`)
    if (res.ok) setCourse(await res.json())
    setLoading(false)
  }

  useEffect(() => { if (id) fetchCourseData() }, [id])

  // CREATE
  const addTask = async () => {
    if (!newTaskTitle) return
    await fetch('/api/admin/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: newTaskTitle, courseId: Number(id) }),
      headers: { 'Content-Type': 'application/json' },
    })
    setNewTaskTitle('')
    fetchCourseData()
  }

  const addLesson = async (taskId: number) => {
    if (!newLesson.title || newLesson.taskId !== taskId) return
    const isGroup = course?.courseType === 'group'
    await fetch('/api/admin/lessons', {
      method: 'POST',
      body: JSON.stringify({ ...newLesson, taskId, homeworkOpen: !isGroup }),
      headers: { 'Content-Type': 'application/json' },
    })
    setNewLesson({ title: '', videoUrl: '', taskId: 0 })
    fetchCourseData()
  }

  const addQuestion = async (lessonId: number) => {
    if (!newQuestion.content || !newQuestion.answer || newQuestion.lessonId !== lessonId) {
      alert('Пожалуйста, заполните текст задачи и ответ!')
      return
    }
    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      body: JSON.stringify({
        type: newQuestion.type, content: newQuestion.content,
        answer: newQuestion.answer, videoUrl: newQuestion.videoUrl || null,
        imageUrl: newQuestion.imageUrl || null, lessonId,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) { alert('Ошибка при сохранении задачи!'); return }
    setNewQuestion({ type: 'value', content: '', answer: '', videoUrl: '', imageUrl: '', lessonId: 0 })
    fetchCourseData()
  }

  // EDIT
  const saveTask = async () => {
    if (!editTask) return
    await fetch(`/api/admin/tasks/${editTask.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: editTask.title }),
      headers: { 'Content-Type': 'application/json' },
    })
    setEditTask(null)
    fetchCourseData()
  }

  const saveLesson = async () => {
    if (!editLesson) return
    await fetch(`/api/admin/lessons/${editLesson.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: editLesson.title, videoUrl: editLesson.videoUrl }),
      headers: { 'Content-Type': 'application/json' },
    })
    setEditLesson(null)
    fetchCourseData()
  }

  const saveQuestion = async () => {
    if (!editQuestion) return
    await fetch(`/api/admin/questions/${editQuestion.id}`, {
      method: 'PATCH',
      body: JSON.stringify(editQuestion),
      headers: { 'Content-Type': 'application/json' },
    })
    setEditQuestion(null)
    fetchCourseData()
  }

  // DELETE
  const deleteTask = async (taskId: number) => {
    if (!confirm('Удалить тему со всеми уроками и ДЗ?')) return
    await fetch(`/api/admin/tasks/${taskId}`, { method: 'DELETE' })
    fetchCourseData()
  }

  const deleteLesson = async (lessonId: number) => {
    if (!confirm('Удалить урок и все задания ДЗ?')) return
    await fetch(`/api/admin/lessons/${lessonId}`, { method: 'DELETE' })
    fetchCourseData()
  }

  const deleteQuestion = async (questionId: number) => {
    if (!confirm('Удалить задачу?')) return
    await fetch(`/api/admin/questions/${questionId}`, { method: 'DELETE' })
    fetchCourseData()
  }

  // OPEN/CLOSE HOMEWORK
  const toggleHomework = async (lessonId: number, open: boolean) => {
    await fetch(`/api/admin/lessons/${lessonId}/open`, {
      method: 'PATCH',
      body: JSON.stringify({ open }),
      headers: { 'Content-Type': 'application/json' },
    })
    fetchCourseData()
  }

  if (loading) return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white font-mono animate-pulse">
      ... ЗАГРУЗКА ДАННЫХ КУРСА ...
    </div>
  )

  if (!course) return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center text-red-400 font-bold uppercase tracking-widest">
      Курс не найден
    </div>
  )

  const isGroup = course.courseType === 'group'

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin/courses" className="inline-block mb-8 text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-white transition border-b border-transparent hover:border-white pb-1">
          ← Назад к списку курсов
        </Link>

        {/* Course header */}
        <div className="bg-[#1a1a1a] border-2 border-white/10 rounded-xl p-8 mb-12 shadow-2xl">
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
              isGroup ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            }`}>
              {isGroup ? '👨‍🏫 Очный' : '🖥️ Заочный'}
            </span>
            {isGroup && course.maxStudents && (
              <span className="text-xs font-mono text-gray-500">до {course.maxStudents} чел.</span>
            )}
            {isGroup && (
              <span className="text-xs font-mono text-yellow-400/70 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                🔒 Уроки открываются вручную
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight mb-4 text-yellow-400">
            {course.title}
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed border-l-4 border-white/20 pl-6 font-mono">
            {course.description}
          </p>
        </div>

        {/* Add task form */}
        <div className="flex flex-col md:flex-row gap-4 mb-10 bg-[#1a1a1a] p-6 rounded-xl border border-white/10">
          <div className="flex-grow">
            <label className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">Создать новую тему</label>
            <input
              className="w-full bg-black/40 border border-white/10 rounded p-4 text-white focus:border-yellow-400 focus:outline-none transition font-mono"
              placeholder="Название новой темы..."
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
            />
          </div>
          <button onClick={addTask} className="self-end bg-white text-black font-extrabold uppercase tracking-widest px-8 py-4 rounded hover:bg-yellow-400 transition transform active:scale-95 whitespace-nowrap">
            + Добавить
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-2xl font-bold uppercase tracking-widest">Программа курса</h2>
          <div className="h-px bg-white/20 flex-grow" />
        </div>

        {/* Tasks */}
        <div className="space-y-8">
          {course.tasks?.length === 0 && (
            <p className="text-gray-500 font-mono text-center py-10 border border-dashed border-white/10 rounded">
              Темы еще не добавлены.
            </p>
          )}

          {course.tasks?.map((task: any, taskIndex: number) => (
            <div key={task.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8 shadow-2xl relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-white/20" />

              {/* Task header */}
              <div className="flex items-end mb-6 gap-3 border-b border-white/10 pb-4">
                <span className="text-5xl font-black text-white/5 select-none leading-none -mb-1">
                  {String(taskIndex + 1).padStart(2, '0')}
                </span>
                {editTask?.id === task.id ? (
                  <div className="flex gap-2 flex-grow">
                    <input
                      className="flex-grow bg-black/40 border border-yellow-400 rounded p-2 text-white focus:outline-none font-mono"
                      value={editTask.title}
                      onChange={e => setEditTask({ ...editTask, title: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && saveTask()}
                      autoFocus
                    />
                    <button onClick={saveTask} className="bg-yellow-400 text-black font-bold px-4 py-2 rounded hover:bg-yellow-300 transition text-sm">✓</button>
                    <button onClick={() => setEditTask(null)} className="text-gray-500 hover:text-white px-3 py-2 transition text-sm">✕</button>
                  </div>
                ) : (
                  <>
                    <h2 className="font-bold text-2xl uppercase tracking-wider text-white mb-1 flex-grow">{task.title}</h2>
                    <div className="flex gap-2 mb-1">
                      <button onClick={() => setEditTask({ id: task.id, title: task.title })} className="text-gray-500 hover:text-yellow-400 transition text-sm px-2 py-1 rounded hover:bg-white/5" title="Редактировать тему">✏️</button>
                      <button onClick={() => deleteTask(task.id)} className="text-gray-500 hover:text-red-400 transition text-sm px-2 py-1 rounded hover:bg-white/5" title="Удалить тему">🗑️</button>
                    </div>
                  </>
                )}
              </div>

              {/* Lessons */}
              <div className="space-y-6 mb-8">
                {task.lessons?.length === 0 && (
                  <p className="text-gray-500 text-sm font-mono italic">Уроков пока нет</p>
                )}

                {task.lessons?.map((lesson: any) => (
                  <div key={lesson.id} className="bg-black/30 border border-white/5 rounded-lg p-6 hover:border-white/20 transition">

                    {/* Lesson header */}
                    <div className="flex flex-col md:flex-row justify-between md:items-start mb-4 gap-4">
                      <div className="flex items-center gap-3 flex-grow">
                        <span className="text-2xl">🎥</span>
                        {editLesson?.id === lesson.id ? (
                          <div className="flex flex-col gap-2 flex-grow">
                            <input
                              className="bg-black/40 border border-yellow-400 rounded p-2 text-white focus:outline-none font-mono w-full"
                              value={editLesson.title}
                              onChange={e => setEditLesson({ ...editLesson, title: e.target.value })}
                              placeholder="Название урока"
                            />
                            <div className="flex gap-2">
                              <input
                                className="flex-grow bg-black/40 border border-white/10 rounded p-2 text-white focus:border-yellow-400 focus:outline-none font-mono text-sm"
                                value={editLesson.videoUrl}
                                onChange={e => setEditLesson({ ...editLesson, videoUrl: e.target.value })}
                                placeholder="URL видео"
                              />
                              <button onClick={() => { setCurrentFileTarget('editLessonVideo'); setIsFileManagerOpen(true) }} className="bg-white/10 px-3 py-2 rounded border border-white/20 hover:bg-yellow-400 hover:text-black transition">📁</button>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={saveLesson} className="bg-yellow-400 text-black font-bold px-4 py-2 rounded hover:bg-yellow-300 transition text-sm">✓ Сохранить</button>
                              <button onClick={() => setEditLesson(null)} className="text-gray-500 hover:text-white px-3 py-2 transition text-sm">Отмена</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 flex-grow">
                            <span className="font-medium font-mono text-lg text-gray-200">{lesson.title}</span>
                            <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5 max-w-xs truncate">
                              {lesson.videoUrl ? `URL: ${lesson.videoUrl}` : 'Видео не прикреплено'}
                            </span>
                          </div>
                        )}
                      </div>

                      {editLesson?.id !== lesson.id && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Open/Close HW button for group courses */}
                          {isGroup && (
                            <button
                              onClick={() => toggleHomework(lesson.id, !lesson.homeworkOpen)}
                              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition border ${
                                lesson.homeworkOpen
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
                                  : 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30'
                              }`}
                            >
                              {lesson.homeworkOpen ? '🔓 Открыт' : '🔒 Закрыт'}
                            </button>
                          )}
                          <button onClick={() => setEditLesson({ id: lesson.id, title: lesson.title, videoUrl: lesson.videoUrl || '' })} className="text-gray-500 hover:text-yellow-400 transition text-sm px-2 py-1 rounded hover:bg-white/5" title="Редактировать урок">✏️</button>
                          <button onClick={() => deleteLesson(lesson.id)} className="text-gray-500 hover:text-red-400 transition text-sm px-2 py-1 rounded hover:bg-white/5" title="Удалить урок">🗑️</button>
                        </div>
                      )}
                    </div>

                    {/* Questions (ДЗ) */}
                    <div className="pl-6 border-l-2 border-white/10 space-y-3 mb-6">
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Домашнее задание:</h4>

                      {(!lesson.questions || lesson.questions.length === 0) ? (
                        <p className="text-gray-600 text-sm font-mono italic bg-white/5 p-3 rounded border border-dashed border-white/10">Задачи еще не добавлены</p>
                      ) : (
                        lesson.questions?.map((q: any, idx: number) => (
                          <div key={q.id} className="bg-[#1a1a1a] p-4 rounded border border-white/5">
                            {editQuestion?.id === q.id ? (
                              <div className="flex flex-col gap-3">
                                <div className="flex gap-2">
                                  <select
                                    className="bg-black/40 border border-white/10 rounded p-2 text-white focus:border-yellow-400 focus:outline-none font-mono text-sm"
                                    value={editQuestion.type}
                                    onChange={e => setEditQuestion({ ...editQuestion, type: e.target.value })}
                                  >
                                    <option value="value">Ввод значения</option>
                                    <option value="option">Выбор (1-4)</option>
                                  </select>
                                  <input className="flex-grow bg-black/40 border border-white/10 rounded p-2 text-white focus:border-yellow-400 focus:outline-none font-mono text-sm" value={editQuestion.content} onChange={e => setEditQuestion({ ...editQuestion, content: e.target.value })} placeholder="Текст задачи" />
                                  <input className="w-28 bg-black/40 border border-white/10 rounded p-2 text-white focus:border-yellow-400 focus:outline-none font-mono text-sm" value={editQuestion.answer} onChange={e => setEditQuestion({ ...editQuestion, answer: e.target.value })} placeholder="Ответ" />
                                </div>
                                <div className="flex gap-2">
                                  <input className="flex-grow bg-black/40 border border-white/10 rounded p-2 text-white focus:border-yellow-400 focus:outline-none font-mono text-sm" value={editQuestion.videoUrl} onChange={e => setEditQuestion({ ...editQuestion, videoUrl: e.target.value })} placeholder="Видео-разбор" />
                                  <button onClick={() => { setCurrentFileTarget('editQuestionVideo'); setIsFileManagerOpen(true) }} className="bg-white/10 px-3 rounded border border-white/20 hover:bg-yellow-400 hover:text-black transition">📁</button>
                                  <input className="flex-grow bg-black/40 border border-white/10 rounded p-2 text-white focus:border-yellow-400 focus:outline-none font-mono text-sm" value={editQuestion.imageUrl} onChange={e => setEditQuestion({ ...editQuestion, imageUrl: e.target.value })} placeholder="Картинка" />
                                  <button onClick={() => { setCurrentFileTarget('editQuestionImage'); setIsFileManagerOpen(true) }} className="bg-white/10 px-3 rounded border border-white/20 hover:bg-yellow-400 hover:text-black transition">📁</button>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={saveQuestion} className="bg-yellow-400 text-black font-bold px-4 py-2 rounded hover:bg-yellow-300 transition text-sm">✓ Сохранить</button>
                                  <button onClick={() => setEditQuestion(null)} className="text-gray-500 hover:text-white px-3 transition text-sm">Отмена</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between items-start mb-3">
                                  <span className="font-bold text-yellow-400 text-sm tracking-wide">Задача {idx + 1}</span>
                                  <div className="flex gap-2">
                                    <span className="text-xs font-mono text-gray-400 bg-black/50 px-2 py-1 rounded">{q.type === 'option' ? 'ВЫБОР' : 'ВВОД'}</span>
                                    <span className="bg-green-500/10 text-green-400 font-mono text-xs px-2 py-1 rounded border border-green-500/20">Ответ: {q.answer}</span>
                                    <button onClick={() => setEditQuestion({ id: q.id, type: q.type, content: q.content || '', answer: q.answer, videoUrl: q.videoUrl || '', imageUrl: q.imageUrl || '' })} className="text-gray-500 hover:text-yellow-400 transition px-1.5 py-1 rounded hover:bg-white/5 text-xs" title="Редактировать">✏️</button>
                                    <button onClick={() => deleteQuestion(q.id)} className="text-gray-500 hover:text-red-400 transition px-1.5 py-1 rounded hover:bg-white/5 text-xs" title="Удалить">🗑️</button>
                                  </div>
                                </div>
                                <div className="text-gray-300 font-mono text-sm mb-3 bg-black/30 p-3 rounded border border-white/5">{q.content}</div>
                                {q.imageUrl && <img src={q.imageUrl} alt="Иллюстрация" className="max-h-48 rounded-lg border border-white/10 mb-3 object-contain bg-black/50" />}
                                {q.videoUrl && (
                                  <div className="text-xs text-blue-400 flex items-center gap-2 bg-blue-900/10 w-max px-3 py-1.5 rounded border border-blue-500/20">
                                    <span>▶ Разбор:</span> <a href={q.videoUrl} target="_blank" rel="noreferrer" className="underline hover:text-blue-300">{q.videoUrl}</a>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add question form */}
                    <div className="mt-4 p-5 bg-white/5 rounded-lg border border-dashed border-white/10 ml-6">
                      <span className="block text-xs font-mono text-gray-400 uppercase tracking-widest mb-4">Добавить задачу в ДЗ</span>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-3">
                          <select className="bg-black/40 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none transition font-mono text-sm" value={newQuestion.lessonId === lesson.id ? newQuestion.type : 'value'} onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value, lessonId: lesson.id })}>
                            <option value="value">Ввод значения</option>
                            <option value="option">Выбор (1-4)</option>
                          </select>
                          <input className="flex-grow bg-black/40 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none transition font-mono text-sm" placeholder="Текст задачи..." value={newQuestion.lessonId === lesson.id ? newQuestion.content : ''} onChange={e => setNewQuestion({ ...newQuestion, content: e.target.value, lessonId: lesson.id })} />
                          <input className="w-full md:w-32 bg-black/40 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none transition font-mono text-sm" placeholder="Ответ" value={newQuestion.lessonId === lesson.id ? newQuestion.answer : ''} onChange={e => setNewQuestion({ ...newQuestion, answer: e.target.value, lessonId: lesson.id })} />
                        </div>
                        <div className="flex flex-col md:flex-row gap-3">
                          <div className="flex flex-grow gap-2">
                            <input className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none transition font-mono text-sm" placeholder="Ссылка на видео-разбор" value={newQuestion.lessonId === lesson.id ? newQuestion.videoUrl : ''} onChange={e => setNewQuestion({ ...newQuestion, videoUrl: e.target.value, lessonId: lesson.id })} />
                            <button type="button" onClick={() => handleOpenManager('questionVideo', lesson.id)} className="bg-white/10 px-4 py-3 rounded border border-white/20 hover:bg-yellow-400 hover:text-black transition">📁</button>
                          </div>
                          <div className="flex flex-grow gap-2">
                            <input className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none transition font-mono text-sm border-l-4 border-l-blue-500" placeholder="Ссылка на картинку" value={newQuestion.lessonId === lesson.id ? newQuestion.imageUrl : ''} onChange={e => setNewQuestion({ ...newQuestion, imageUrl: e.target.value, lessonId: lesson.id })} />
                            <button type="button" onClick={() => handleOpenManager('questionImage', lesson.id)} className="bg-white/10 px-4 py-3 rounded border border-white/20 hover:bg-yellow-400 hover:text-black transition">📁</button>
                          </div>
                        </div>
                        {newQuestion.lessonId === lesson.id && newQuestion.imageUrl && (
                          <div className="relative w-max mt-2">
                            <span className="text-xs text-black bg-yellow-400 px-2 py-0.5 rounded-t-lg absolute -top-5 left-0 font-bold font-mono">Предпросмотр</span>
                            <img src={newQuestion.imageUrl} alt="preview" className="max-h-40 rounded-b-lg rounded-tr-lg border-2 border-yellow-400/50 object-contain bg-black/80" onError={e => (e.currentTarget.style.display = 'none')} />
                          </div>
                        )}
                        <button onClick={() => addQuestion(lesson.id)} className="bg-white/10 text-white font-bold uppercase tracking-widest text-xs px-6 py-3 rounded hover:bg-yellow-400 hover:text-black transition whitespace-nowrap border border-white/20 hover:border-yellow-400 w-full md:w-max self-end mt-2">
                          Сохранить задачу
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add lesson form */}
              <div className="bg-white/5 p-6 rounded-xl border border-dashed border-white/20 mt-6">
                <span className="block text-xs font-mono text-white uppercase tracking-widest mb-4">Создать новый урок в теме</span>
                <div className="flex flex-col md:flex-row gap-3">
                  <input className="flex-grow bg-black/40 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none transition font-mono text-sm" placeholder="Название урока" value={newLesson.taskId === task.id ? newLesson.title : ''} onChange={e => setNewLesson({ ...newLesson, title: e.target.value, taskId: task.id })} />
                  <div className="flex flex-grow gap-2">
                    <input className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none transition font-mono text-sm" placeholder="Ссылка на лекцию" value={newLesson.taskId === task.id ? newLesson.videoUrl : ''} onChange={e => setNewLesson({ ...newLesson, videoUrl: e.target.value, taskId: task.id })} />
                    <button type="button" onClick={() => handleOpenManager('lessonVideo', task.id)} className="bg-white/10 px-4 py-3 rounded border border-white/20 hover:bg-yellow-400 hover:text-black transition">📁</button>
                  </div>
                  <button onClick={() => addLesson(task.id)} className="bg-white text-black font-extrabold uppercase tracking-widest text-xs px-8 py-3 rounded hover:bg-yellow-400 transition transform active:scale-95 whitespace-nowrap">
                    Добавить урок
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <FileManagerModal
        isOpen={isFileManagerOpen}
        onClose={() => setIsFileManagerOpen(false)}
        onSelect={handleSelectFile}
        baseFolder="courses"
      />
    </div>
  )
}