'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function StudentProfilePage() {
  const { id } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      const res = await fetch(`/api/admin/students/${id}`);
      if (res.ok) setStudent(await res.json());
      setLoading(false);
    };
    if (id) fetchStudent();
  }, [id]);

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

  // Вычисляем статистику
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

      {/* Шапка профиля */}
      <div className="bg-[#1a1a1a] border-2 border-white/10 rounded-xl p-8 mb-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-8">
        <div className="absolute top-0 right-0 p-6 opacity-5">
            <svg width="150" height="150" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
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
            {student.isAdmin && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-1 rounded font-mono text-xs font-bold uppercase tracking-widest mt-2 md:mt-0">
                Администратор
              </span>
            )}
          </div>
          <p className="text-gray-400 font-mono text-lg mb-6">
            {student.username ? `@${student.username}` : `TG ID: ${student.telegramId}`}
          </p>

          {/* Карточки статистики */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      <div className="flex items-center gap-4 mb-6 mt-12">
        <h2 className="text-2xl font-bold uppercase tracking-widest">История домашних заданий</h2>
        <div className="h-px bg-white/20 flex-grow"></div>
      </div>

      {/* Лента ответов */}
      <div className="space-y-4">
        {(!student.attempts || student.attempts.length === 0) && (
          <div className="bg-[#1a1a1a] border border-dashed border-white/20 rounded-xl p-10 text-center text-gray-500 font-mono">
            Студент еще не сдавал ни одного домашнего задания.
          </div>
        )}

        {student.attempts?.map((attempt: any, idx: number) => {
          const isPerfect = attempt.percent === 100;
          
          return (
            <div key={attempt.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 shadow-lg hover:border-white/30 transition flex flex-col md:flex-row gap-6 items-start md:items-center">
              
              {/* Левая часть: Курс и Урок */}
              <div className="flex-grow">
                <div className="text-xs font-mono text-gray-500 mb-2 flex flex-wrap gap-2 items-center uppercase tracking-widest">
                  <span className="bg-white/5 px-2 py-1 rounded border border-white/5">{attempt.lesson?.task?.course?.title || 'Удаленный курс'}</span>
                  <span>→</span>
                  <span className="text-gray-400">{attempt.lesson?.task?.title || 'Удаленная тема'}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-3">
                  <span>🎥 {attempt.lesson?.title || 'Удаленный урок'}</span>
                </h3>
              </div>

              {/* Правая часть: Результат */}
              <div className="flex flex-col items-start md:items-end min-w-[150px]">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Результат:</span>
                <div className={`text-3xl font-black flex items-center gap-2 ${isPerfect ? 'text-green-400' : 'text-yellow-400'}`}>
                  {attempt.percent}%
                  {isPerfect && <span className="text-xl">✅</span>}
                </div>
                
                {/* Прогресс бар попытки */}
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