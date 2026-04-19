'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function StudentProfilePage() {
  const { id } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable role fields
  const [isPremium, setIsPremium] = useState(false);
  const [questionsLimit, setQuestionsLimit] = useState(5);
  const [isCurator, setIsCurator] = useState(false);

  useEffect(() => {
    const fetchStudent = async () => {
      const res = await fetch(`/api/admin/students/${id}`);
      if (res.ok) {
        const data = await res.json();
        setStudent(data);
        setIsPremium(data.isPremium ?? false);
        setQuestionsLimit(data.questionsLimit ?? 5);
        setIsCurator(data.isCurator ?? false);
      }
      setLoading(false);
    };
    if (id) fetchStudent();
  }, [id]);

  const saveRoles = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/students/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPremium, questionsLimit, isCurator }),
    });
    if (res.ok) {
      const data = await res.json();
      setStudent((prev: any) => ({ ...prev, ...data }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-white font-mono animate-pulse">
      ... ЗАГРУЗКА ДАННЫХ СТУДЕНТА ...
    </div>
  );

  if (!student) return (
    <div className="min-h-screen flex items-center justify-center text-red-400 font-bold uppercase tracking-widest">
      Студент не найден
    </div>
  );

  const totalAttempts = student.attempts?.length || 0;
  const completedHw = student.attempts?.filter((a: any) => a.isCompleted || a.percent === 100).length || 0;
  const avgPercent = totalAttempts > 0
    ? (student.attempts.reduce((acc: number, a: any) => acc + a.percent, 0) / totalAttempts).toFixed(1)
    : 0;

  return (
    <div>
      <Link
        href="/admin/students"
        className="inline-block mb-8 text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-white transition border-b border-transparent hover:border-white pb-1"
      >
        ← Назад к списку студентов
      </Link>

      {/* Profile header */}
      <div className="bg-[#1a1a1a] border-2 border-white/10 rounded-xl p-8 mb-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-8">
        <div className="absolute top-0 right-0 p-6 opacity-5">
          <svg width="150" height="150" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>

        <img
          src={student.photoUrl || "https://ui-avatars.com/api/?name=" + (student.firstName || "S") + "&background=random&size=128"}
          alt="avatar"
          className="w-32 h-32 rounded-2xl border-4 border-white/10 shadow-lg relative z-10 object-cover"
        />

        <div className="relative z-10 flex-grow text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
            <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-white">
              {student.firstName} {student.lastName}
            </h1>
            <div className="flex gap-2 flex-wrap justify-center">
              {student.isAdmin && (
                <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-1 rounded font-mono text-xs font-bold uppercase tracking-widest">
                  Администратор
                </span>
              )}
              {student.isPremium && (
                <span className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/50 px-3 py-1 rounded font-mono text-xs font-bold uppercase tracking-widest">
                  ⭐ Premium
                </span>
              )}
              {student.isCurator && (
                <span className="bg-purple-500/20 text-purple-400 border border-purple-500/50 px-3 py-1 rounded font-mono text-xs font-bold uppercase tracking-widest">
                  🎓 Куратор
                </span>
              )}
            </div>
          </div>
          <p className="text-gray-400 font-mono text-lg mb-6">
            {student.username ? `@${student.username}` : `TG ID: ${student.telegramId}`}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-black/40 border border-white/10 rounded-lg p-4">
              <span className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Баллы</span>
              <span className="text-2xl font-black text-yellow-400">{student.points} 💎</span>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-lg p-4">
              <span className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Решено ДЗ</span>
              <span className="text-2xl font-black text-white">{completedHw} <span className="text-sm text-gray-500">/ {totalAttempts}</span></span>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-lg p-4">
              <span className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Средний балл</span>
              <span className="text-2xl font-black text-green-400">{avgPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role management */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 mb-8 relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 rounded-l-xl" />
        <h2 className="text-lg font-bold uppercase tracking-widest mb-5 pl-2">Управление ролями</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {/* Premium toggle */}
          <div className={`p-4 rounded-xl border transition cursor-pointer ${
            isPremium ? 'bg-yellow-400/10 border-yellow-400/40' : 'bg-black/30 border-white/10 hover:border-white/20'
          }`} onClick={() => setIsPremium(!isPremium)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white">⭐ Premium</span>
              <div className={`w-10 h-5 rounded-full border transition relative ${
                isPremium ? 'bg-yellow-400 border-yellow-400' : 'bg-black/40 border-white/20'
              }`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                  isPremium ? 'left-5 bg-black' : 'left-0.5 bg-white/40'
                }`} />
              </div>
            </div>
            <p className="text-xs text-gray-500 font-mono">Доступ к вопросам куратору</p>
          </div>

          {/* Questions limit — only visible if premium */}
          <div className={`p-4 rounded-xl border transition ${
            isPremium ? 'bg-black/30 border-white/10' : 'bg-black/10 border-white/5 opacity-40 pointer-events-none'
          }`}>
            <label className="block text-sm font-bold text-white mb-2">📊 Лимит вопросов/мес.</label>
            <input
              type="number"
              min="0"
              max="100"
              value={questionsLimit}
              onChange={e => setQuestionsLimit(parseInt(e.target.value) || 0)}
              className="w-full bg-black/40 border border-white/10 rounded p-2 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none text-center"
            />
            <p className="text-xs text-gray-500 font-mono mt-1">0 = безлимитно</p>
          </div>

          {/* Curator toggle */}
          <div className={`p-4 rounded-xl border transition cursor-pointer ${
            isCurator ? 'bg-purple-500/10 border-purple-500/40' : 'bg-black/30 border-white/10 hover:border-white/20'
          }`} onClick={() => setIsCurator(!isCurator)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white">🎓 Куратор</span>
              <div className={`w-10 h-5 rounded-full border transition relative ${
                isCurator ? 'bg-purple-500 border-purple-500' : 'bg-black/40 border-white/20'
              }`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                  isCurator ? 'left-5 bg-white' : 'left-0.5 bg-white/40'
                }`} />
              </div>
            </div>
            <p className="text-xs text-gray-500 font-mono">Может проверять работы студентов</p>
          </div>
        </div>

        <button
          onClick={saveRoles}
          disabled={saving}
          className={`px-8 py-3 rounded-xl font-extrabold uppercase tracking-widest transition ${
            saved ? 'bg-green-500 text-black' : 'bg-white text-black hover:bg-yellow-400'
          } disabled:opacity-50`}
        >
          {saving ? 'Сохранение...' : saved ? '✓ Сохранено' : 'Сохранить роли'}
        </button>
      </div>

      {/* Homework history */}
      <div className="flex items-center gap-4 mb-6 mt-12">
        <h2 className="text-2xl font-bold uppercase tracking-widest">История домашних заданий</h2>
        <div className="h-px bg-white/20 flex-grow"></div>
      </div>

      <div className="space-y-4">
        {(!student.attempts || student.attempts.length === 0) && (
          <div className="bg-[#1a1a1a] border border-dashed border-white/20 rounded-xl p-10 text-center text-gray-500 font-mono">
            Студент еще не сдавал ни одного домашнего задания.
          </div>
        )}

        {student.attempts?.map((attempt: any) => {
          const isPerfect = attempt.percent === 100;
          return (
            <div key={attempt.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 shadow-lg hover:border-white/30 transition flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="flex-grow">
                <div className="text-xs font-mono text-gray-500 mb-2 flex flex-wrap gap-2 items-center uppercase tracking-widest">
                  <span className="bg-white/5 px-2 py-1 rounded border border-white/5">{attempt.lesson?.task?.course?.title || 'Удаленный курс'}</span>
                  <span>→</span>
                  <span className="text-gray-400">{attempt.lesson?.task?.title || 'Удаленная тема'}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">
                  🎥 {attempt.lesson?.title || 'Удаленный урок'}
                </h3>
              </div>
              <div className="flex flex-col items-start md:items-end min-w-[150px]">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Результат:</span>
                <div className={`text-3xl font-black flex items-center gap-2 ${isPerfect ? 'text-green-400' : 'text-yellow-400'}`}>
                  {attempt.percent}%
                  {isPerfect && <span className="text-xl">✅</span>}
                </div>
                <div className="w-full h-1.5 bg-black rounded-full mt-3 overflow-hidden border border-white/5">
                  <div
                    className={`h-full ${isPerfect ? 'bg-green-500' : 'bg-yellow-400'}`}
                    style={{ width: `${attempt.percent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}