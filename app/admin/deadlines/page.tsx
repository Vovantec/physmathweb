'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const POLICIES = [
  { value: 'mark',    label: 'Только отметка',  desc: 'Можно сдать, но помечается как просроченное', icon: '🏷️' },
  { value: 'penalty', label: 'Штраф',           desc: 'Баллы умножаются на коэффициент', icon: '⚠️' },
  { value: 'block',   label: 'Блокировка',      desc: 'Сдача заблокирована после дедлайна', icon: '🚫' },
]

export default function AdminDeadlinesPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/courses').then(r => r.json()).then(setCourses)
  }, [])

  const loadCourse = async (courseId: number) => {
    const res = await fetch(`/api/admin/courses/${courseId}`)
    const data = await res.json()
    setSelectedCourse(data)
  }

  const updateLessonOffset = (taskId: number, lessonId: number, value: string) => {
    const parsed = value === '' ? null : parseInt(value)
    setSelectedCourse((prev: any) => ({
      ...prev,
      tasks: prev.tasks.map((t: any) =>
        t.id !== taskId
          ? t
          : {
              ...t,
              lessons: t.lessons.map((l: any) =>
                l.id !== lessonId
                  ? l
                  : { ...l, deadlineOffsetDays: isNaN(parsed as number) ? null : parsed }
              ),
            }
      ),
    }))
  }

  const updateLessonFreeReferral = (taskId: number, lessonId: number, value: boolean) => {
    setSelectedCourse((prev: any) => ({
      ...prev,
      tasks: prev.tasks.map((t: any) =>
        t.id !== taskId
          ? t
          : {
              ...t,
              lessons: t.lessons.map((l: any) =>
                l.id !== lessonId ? l : { ...l, isFreeForReferrals: value }
              ),
            }
      ),
    }))
  }

  const updatePolicy = (policy: string) => {
    setSelectedCourse((prev: any) => ({ ...prev, deadlinePolicy: policy }))
  }

  const updatePenaltyMultiplier = (v: string) => {
    const f = parseFloat(v)
    setSelectedCourse((prev: any) => ({
      ...prev,
      penaltyMultiplier: isNaN(f) ? 0.5 : Math.max(0, Math.min(1, f)),
    }))
  }

  const handleSave = async () => {
    if (!selectedCourse) return
    setSaving(true)

    try {
      // Save course policy
      await fetch(`/api/admin/deadlines/${selectedCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deadlinePolicy: selectedCourse.deadlinePolicy,
          penaltyMultiplier: selectedCourse.penaltyMultiplier,
          lessons: selectedCourse.tasks.flatMap((t: any) =>
            t.lessons.map((l: any) => ({
              id: l.id,
              deadlineOffsetDays: l.deadlineOffsetDays,
              isFreeForReferrals: l.isFreeForReferrals,
            }))
          ),
        }),
      })

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">
          Дедлайны и доступ
        </h1>
        <div className="h-px bg-white/20 flex-grow" />
      </div>

      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 mb-6">
        <p className="text-sm font-mono text-gray-400 leading-relaxed">
          Дедлайны — <strong className="text-white">относительные</strong>. Укажите количество дней от момента
          зачисления ученика на курс. Например, «7» означает «7 дней с момента первого
          открытия курса». Оставьте пустым, чтобы урок не имел дедлайна.
        </p>
      </div>

      {/* Course selector */}
      <div className="flex flex-wrap gap-3 mb-8">
        {courses.map((c: any) => (
          <button
            key={c.id}
            onClick={() => loadCourse(c.id)}
            className={`px-5 py-2.5 rounded-lg border text-sm font-bold transition ${
              selectedCourse?.id === c.id
                ? 'bg-white text-black border-white'
                : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {selectedCourse && (
        <>
          {/* Policy selector */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">
              Политика просрочки
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {POLICIES.map(p => (
                <button
                  key={p.value}
                  onClick={() => updatePolicy(p.value)}
                  className={`p-4 rounded-xl border text-left transition ${
                    selectedCourse.deadlinePolicy === p.value
                      ? 'bg-white/10 border-white text-white'
                      : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/30'
                  }`}
                >
                  <span className="text-2xl block mb-2">{p.icon}</span>
                  <span className="font-bold block mb-1">{p.label}</span>
                  <span className="text-xs font-mono opacity-70">{p.desc}</span>
                </button>
              ))}
            </div>

            {selectedCourse.deadlinePolicy === 'penalty' && (
              <div className="flex items-center gap-4 bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4">
                <span className="text-sm font-mono text-yellow-400 flex-shrink-0">
                  Коэффициент штрафа:
                </span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={selectedCourse.penaltyMultiplier}
                  onChange={e => updatePenaltyMultiplier(e.target.value)}
                  className="w-24 bg-black/40 border border-yellow-400/30 rounded p-2 text-white font-mono text-center focus:outline-none focus:border-yellow-400"
                />
                <span className="text-xs text-gray-400 font-mono">
                  (0 = 0 баллов, 0.5 = половина баллов, 1 = полные баллы)
                </span>
              </div>
            )}
          </div>

          {/* Lessons list */}
          <div className="space-y-6 mb-8">
            {selectedCourse.tasks?.map((task: any) => (
              <div key={task.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
                <h3 className="font-bold text-lg uppercase tracking-wide mb-4 text-yellow-400">
                  {task.title}
                </h3>

                <div className="space-y-3">
                  {task.lessons?.map((lesson: any) => (
                    <div
                      key={lesson.id}
                      className="flex flex-col md:flex-row md:items-center gap-3 bg-black/30 border border-white/5 rounded-xl p-4"
                    >
                      <div className="flex-grow font-mono text-sm text-gray-300">
                        {lesson.title}
                      </div>

                      {/* Deadline offset */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-mono text-gray-500 whitespace-nowrap">
                          Дней на выполнение:
                        </span>
                        <input
                          type="number"
                          min="1"
                          placeholder="∞"
                          value={lesson.deadlineOffsetDays ?? ''}
                          onChange={e =>
                            updateLessonOffset(task.id, lesson.id, e.target.value)
                          }
                          className="w-20 bg-black/40 border border-white/10 rounded p-2 text-white font-mono text-center text-sm focus:border-yellow-400 focus:outline-none transition"
                        />
                      </div>

                      {/* Free for referrals */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <div
                            onClick={() =>
                              updateLessonFreeReferral(
                                task.id,
                                lesson.id,
                                !lesson.isFreeForReferrals
                              )
                            }
                            className={`w-10 h-5 rounded-full border transition relative ${
                              lesson.isFreeForReferrals
                                ? 'bg-yellow-400 border-yellow-400'
                                : 'bg-black/40 border-white/20'
                            }`}
                          >
                            <div
                              className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                                lesson.isFreeForReferrals
                                  ? 'left-5 bg-black'
                                  : 'left-0.5 bg-white/40'
                              }`}
                            />
                          </div>
                          <span className="text-xs font-mono text-gray-400 whitespace-nowrap">
                            🔗 Бесплатно по реферальной
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Save button */}
          <div className="sticky bottom-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-8 py-4 rounded-xl font-extrabold uppercase tracking-widest transition ${
                saved
                  ? 'bg-green-500 text-black'
                  : 'bg-white text-black hover:bg-yellow-400'
              } disabled:opacity-50`}
            >
              {saving ? 'Сохранение...' : saved ? '✓ Сохранено' : 'Сохранить изменения'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}