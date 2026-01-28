"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Attempt {
  percent: number;
}

interface Lesson {
  id: number;
  title: string;
  attempts?: Attempt[];
}
interface Task {
  id: number;
  title: string;
  lessons: Lesson[];
}
interface CourseDetail {
  id: number;
  title: string;
  description: string;
  tasks: Task[];
}

export default function CoursePage() {
  const { id } = useParams();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    // Получаем ID пользователя, чтобы запросить его прогресс
    const userId = localStorage.getItem('user_id');
    const query = userId ? `?userId=${userId}` : '';

    fetch(`/api/courses/${id}${query}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => {
        setCourse(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white font-mono animate-pulse">
      ... ЗАГРУЗКА ДАННЫХ ...
    </div>
  );

  if (!course) return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center text-red-400 font-bold uppercase tracking-widest">
      Курс не найден
    </div>
  );

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link 
            href="/" 
            className="inline-block mb-8 text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-white transition border-b border-transparent hover:border-white pb-1"
        >
          ← Назад к списку
        </Link>
        
        <div className="bg-[#1a1a1a] border-2 border-white/10 rounded-xl p-8 mb-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
             <svg width="100" height="100" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight mb-4">{course.title}</h1>
          <p className="text-gray-400 text-lg leading-relaxed border-l-4 border-white/20 pl-6 font-mono">
            {course.description}
          </p>
        </div>

        <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold uppercase tracking-widest">Программа</h2>
            <div className="h-px bg-white/20 flex-grow"></div>
        </div>
        
        <div className="space-y-8">
          {course.tasks.length === 0 && (
              <p className="text-gray-500 font-mono text-center py-10 border border-dashed border-white/10 rounded">
                  Задачи еще не добавлены.
              </p>
          )}

          {course.tasks.map((task, index) => (
            <div key={task.id} className="group">
              <div className="flex items-end mb-4 gap-3">
                 <span className="text-5xl font-black text-white/5 select-none leading-none -mb-1">
                    {String(index + 1).padStart(2, '0')}
                 </span>
                 <h3 className="font-bold text-xl uppercase tracking-wider text-white group-hover:text-yellow-400 transition mb-1">
                    {task.title}
                 </h3>
              </div>

              <div className="bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden">
                {task.lessons.map((lesson) => {
                  // Проверяем, есть ли успешные попытки (например, > 0% или 100%)
                  // В attempts приходят только попытки текущего юзера
                  const isCompleted = lesson.attempts && lesson.attempts.length > 0;
                  const bestResult = isCompleted 
                    ? Math.max(...lesson.attempts!.map(a => a.percent)) 
                    : 0;
                  const isPerfect = bestResult === 100;

                  return (
                    <Link 
                        key={lesson.id} 
                        href={`/lesson/${lesson.id}`}
                        className="flex justify-between items-center px-6 py-5 border-b border-white/5 last:border-0 hover:bg-white hover:text-black transition duration-200 group/lesson"
                    >
                        <div className="flex items-center gap-4">
                            {/* Индикатор прохождения */}
                            <div className={`w-6 h-6 flex items-center justify-center rounded-full border ${isCompleted ? (isPerfect ? 'bg-green-500 border-green-500 text-white' : 'bg-blue-500 border-blue-500 text-white') : 'border-white/20 text-transparent'}`}>
                                {isCompleted && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                )}
                            </div>
                            
                            <span className={`font-medium font-mono text-lg ${isCompleted ? 'text-gray-300 group-hover/lesson:text-black' : ''}`}>
                            {lesson.title}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {isCompleted && (
                                <span className="text-xs font-bold font-mono px-2 py-1 bg-white/10 rounded group-hover/lesson:bg-black/10">
                                    {bestResult}%
                                </span>
                            )}
                            <span className="text-xs font-bold uppercase tracking-widest border border-white/20 px-2 py-1 rounded group-hover/lesson:border-black/20">
                                {isCompleted ? 'Обзор' : 'Старт'}
                            </span>
                        </div>
                    </Link>
                  );
                })}
                {task.lessons.length === 0 && (
                  <div className="px-6 py-6 text-gray-500 font-mono text-sm italic">
                      Материалы готовятся...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}