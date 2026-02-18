'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminStudentsList() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    const res = await fetch('/api/admin/students');
    if (res.ok) {
      setStudents(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-white font-mono animate-pulse">
      ... ЗАГРУЗКА БАЗЫ СТУДЕНТОВ ...
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-white">
          База студентов
        </h1>
        <div className="h-px bg-white/20 flex-grow"></div>
        <span className="bg-yellow-400 text-black font-bold font-mono px-3 py-1 rounded text-sm">
          Всего: {students.length}
        </span>
      </div>

      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-black/40 border-b-2 border-white/10 text-xs uppercase tracking-widest text-gray-500 font-mono">
                <th className="p-5 font-medium">Студент</th>
                <th className="p-5 font-medium">Баллы</th>
                <th className="p-5 font-medium">Сдано ДЗ</th>
                <th className="p-5 font-medium">Средний %</th>
                <th className="p-5 font-medium text-right">Роль</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 font-mono border-dashed border-b border-white/5">
                    Студентов пока нет.
                  </td>
                </tr>
              )}
              
              {students.map((user: any) => {
                // Вычисляем статистику на лету
                const totalAttempts = user.attempts?.length || 0;
                const completedHw = user.attempts?.filter((a: any) => a.isCompleted || a.percent === 100).length || 0;
                const avgPercent = totalAttempts > 0 
                  ? (user.attempts.reduce((acc: number, a: any) => acc + a.percent, 0) / totalAttempts).toFixed(1) 
                  : 0;

                return (
                  <tr key={user.id} className="hover:bg-white/5 transition group">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <img 
                          src={user.photoUrl || "https://ui-avatars.com/api/?name=" + (user.firstName || "S") + "&background=random"} 
                          alt="avatar" 
                          className="w-10 h-10 rounded-full border border-white/10"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-white group-hover:text-yellow-400 transition">
                            {user.firstName || "Без имени"}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            {user.username ? `@${user.username}` : `ID: ${user.telegramId}`}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-5">
                      <span className="text-yellow-400 font-extrabold font-mono bg-yellow-400/10 px-3 py-1.5 rounded border border-yellow-400/20">
                        {user.points} 💎
                      </span>
                    </td>
                    
                    <td className="p-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-mono text-white">
                          <span className="text-green-400">{completedHw}</span> / {totalAttempts} попыток
                        </span>
                        {totalAttempts > 0 && (
                          <div className="w-24 h-1.5 bg-black/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500" 
                              style={{ width: `${Math.min((completedHw / totalAttempts) * 100, 100)}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="p-5">
                      <span className="text-sm font-mono text-gray-300">
                        {avgPercent}%
                      </span>
                    </td>
                    
                    <td className="p-5 text-right">
                        <div className="flex items-center justify-end gap-4">
                            {user.isAdmin ? (
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-400 border border-red-400/30 bg-red-400/10 px-3 py-1 rounded">
                                Админ
                            </span>
                            ) : (
                            <span className="text-xs font-mono uppercase tracking-widest text-gray-500 border border-white/10 bg-white/5 px-3 py-1 rounded">
                                Ученик
                            </span>
                            )}
                            
                            <Link 
                            href={`/admin/students/${user.id}`}
                            className="bg-white/10 hover:bg-yellow-400 hover:text-black text-white px-4 py-2 rounded transition text-xs font-bold uppercase tracking-widest font-mono border border-transparent hover:border-yellow-400"
                            >
                            Профиль →
                            </Link>
                        </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}