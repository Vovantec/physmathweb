'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AdminCoursesList() {
  const [courses, setCourses] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courseType, setCourseType] = useState<'self' | 'group'>('self')
  const [maxStudents, setMaxStudents] = useState('')
  const [loading, setLoading] = useState(true)

  // Edit state
  const [editId, setEditId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editType, setEditType] = useState<'self' | 'group'>('self')
  const [editMax, setEditMax] = useState('')

  const fetchCourses = async () => {
    const res = await fetch('/api/admin/courses')
    if (res.ok) setCourses(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchCourses() }, [])

  const addCourse = async () => {
    if (!title) return
    await fetch('/api/admin/courses', {
      method: 'POST',
      body: JSON.stringify({ title, description, courseType, maxStudents: maxStudents || null }),
      headers: { 'Content-Type': 'application/json' },
    })
    setTitle(''); setDescription(''); setCourseType('self'); setMaxStudents('')
    fetchCourses()
  }

  const startEdit = (course: any) => {
    setEditId(course.id)
    setEditTitle(course.title)
    setEditDescription(course.description ?? '')
    setEditType(course.courseType ?? 'self')
    setEditMax(course.maxStudents?.toString() ?? '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveEdit = async () => {
    if (!editId) return
    await fetch(`/api/admin/courses/${editId}/edit`, {
      method: 'PATCH',
      body: JSON.stringify({ title: editTitle, description: editDescription, courseType: editType, maxStudents: editMax || null }),
      headers: { 'Content-Type': 'application/json' },
    })
    setEditId(null)
    fetchCourses()
  }

  const deleteCourse = async (id: number) => {
    if (!confirm('Удалить курс со всеми темами, уроками и ДЗ?')) return
    await fetch(`/api/admin/courses/${id}/edit`, { method: 'DELETE' })
    fetchCourses()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-white font-mono animate-pulse">
      ... ЗАГРУЗКА СПИСКА КУРСОВ ...
    </div>
  )

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight mb-8">
        Управление курсами
      </h1>

      {/* Form */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8 mb-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400" />
        <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-6">
          {editId ? 'Редактировать курс' : 'Создать новый курс'}
        </h2>

        <div className="flex flex-col gap-4">
          <input
            className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-white focus:border-yellow-400 focus:outline-none transition font-mono"
            placeholder="Название курса"
            value={editId ? editTitle : title}
            onChange={e => editId ? setEditTitle(e.target.value) : setTitle(e.target.value)}
          />
          <textarea
            className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-white focus:border-yellow-400 focus:outline-none transition font-mono min-h-[100px] resize-y"
            placeholder="Краткое описание курса..."
            value={editId ? editDescription : description}
            onChange={e => editId ? setEditDescription(e.target.value) : setDescription(e.target.value)}
          />

          {/* Course type */}
          <div className="flex gap-3">
            {(['self', 'group'] as const).map(t => (
              <button
                key={t}
                onClick={() => editId ? setEditType(t) : setCourseType(t)}
                className={`flex-1 py-3 rounded-lg border text-sm font-bold uppercase tracking-widest transition ${
                  (editId ? editType : courseType) === t
                    ? 'bg-white text-black border-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                }`}
              >
                {t === 'self' ? '🖥️ Заочный' : '👨‍🏫 Очный'}
              </button>
            ))}
          </div>

          {/* Max students (group only) */}
          {(editId ? editType : courseType) === 'group' && (
            <input
              type="number"
              min="1"
              className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-white focus:border-yellow-400 focus:outline-none transition font-mono"
              placeholder="Максимальное количество студентов"
              value={editId ? editMax : maxStudents}
              onChange={e => editId ? setEditMax(e.target.value) : setMaxStudents(e.target.value)}
            />
          )}

          <div className="flex gap-3">
            <button
              onClick={editId ? saveEdit : addCourse}
              className="bg-white text-black font-extrabold uppercase tracking-widest px-8 py-4 rounded-lg hover:bg-yellow-400 transition transform active:scale-95"
            >
              {editId ? '💾 Сохранить' : '+ Сохранить курс'}
            </button>
            {editId && (
              <button
                onClick={() => setEditId(null)}
                className="border border-white/20 text-gray-400 hover:text-white font-bold uppercase tracking-widest px-6 py-4 rounded-lg transition"
              >
                Отмена
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold uppercase tracking-widest">Существующие курсы</h2>
        <div className="h-px bg-white/20 flex-grow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {courses.length === 0 && (
          <div className="col-span-full text-center py-12 border border-dashed border-white/10 rounded-xl">
            <p className="text-gray-500 font-mono">Курсов пока нет. Создайте первый курс выше.</p>
          </div>
        )}

        {courses.map((course: any) => (
          <div key={course.id} className="bg-[#1a1a1a] border border-white/10 p-6 rounded-xl hover:border-white/40 transition flex flex-col group shadow-lg">
            <div className="flex items-start gap-3 mb-3">
              <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                course.courseType === 'group'
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                  : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              }`}>
                {course.courseType === 'group' ? '👨‍🏫 Очный' : '🖥️ Заочный'}
              </span>
              {course.courseType === 'group' && course.maxStudents && (
                <span className="text-xs font-mono text-gray-500 bg-black/50 px-2 py-0.5 rounded">
                  до {course.maxStudents} чел.
                </span>
              )}
            </div>

            <h3 className="text-2xl font-bold mb-3 text-white uppercase tracking-tight group-hover:text-yellow-400 transition">
              {course.title}
            </h3>
            <p className="text-gray-400 font-mono text-sm leading-relaxed mb-6 flex-grow">
              {course.description || 'Без описания'}
            </p>

            <div className="flex justify-between items-center pt-4 border-t border-white/5 gap-2 flex-wrap">
              <span className="text-xs font-mono text-gray-500 bg-black/50 px-3 py-1.5 rounded">
                ID: {course.id}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(course)}
                  className="text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 px-4 py-2 rounded transition"
                >
                  ✏️ Изменить
                </button>
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black px-4 py-2 rounded transition"
                >
                  Содержание →
                </Link>
                <button
                  onClick={() => deleteCourse(course.id)}
                  className="text-xs font-bold uppercase tracking-widest bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-2 rounded transition"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}