'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminCoursesList() {
  const [courses, setCourses] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCourses = async () => {
    const res = await fetch('/api/courses');
    if (res.ok) setCourses(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchCourses(); }, []);

  const addCourse = async () => {
    if (!title) return;
    await fetch('/api/admin/courses', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
      headers: { 'Content-Type': 'application/json' }
    });
    setTitle('');
    setDescription('');
    fetchCourses();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-white font-mono animate-pulse">
      ... ЗАГРУЗКА СПИСКА КУРСОВ ...
    </div>
  );

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight mb-8">
        Управление курсами
      </h1>

      {/* Форма создания курса */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8 mb-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
        <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-6">Создать новый курс</h2>
        
        <div className="flex flex-col gap-4">
          <input 
            className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-white focus:border-yellow-400 focus:outline-none transition font-mono"
            placeholder="Название курса (например: ЕГЭ Математика 2026)" 
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <textarea 
            className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-white focus:border-yellow-400 focus:outline-none transition font-mono min-h-[100px] resize-y"
            placeholder="Краткое описание курса..." 
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <button 
            onClick={addCourse}
            className="self-start bg-white text-black font-extrabold uppercase tracking-widest px-8 py-4 rounded-lg hover:bg-yellow-400 transition transform active:scale-95 mt-2"
          >
            + Сохранить курс
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold uppercase tracking-widest">Существующие курсы</h2>
        <div className="h-px bg-white/20 flex-grow"></div>
      </div>

      {/* Список курсов */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {courses.length === 0 && (
          <div className="col-span-full text-center py-12 border border-dashed border-white/10 rounded-xl">
            <p className="text-gray-500 font-mono">Курсов пока нет. Создайте первый курс выше.</p>
          </div>
        )}

        {courses.map((course: any) => (
          <div key={course.id} className="bg-[#1a1a1a] border border-white/10 p-6 rounded-xl hover:border-white/40 transition flex flex-col group shadow-lg">
            <h3 className="text-2xl font-bold mb-3 text-white uppercase tracking-tight group-hover:text-yellow-400 transition">
              {course.title}
            </h3>
            <p className="text-gray-400 font-mono text-sm leading-relaxed mb-6 flex-grow">
              {course.description || "Без описания"}
            </p>
            
            <div className="flex justify-between items-center pt-4 border-t border-white/5">
              <span className="text-xs font-mono text-gray-500 bg-black/50 px-3 py-1.5 rounded">
                ID: {course.id}
              </span>
              <Link 
                href={`/admin/courses/${course.id}`} 
                className="text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black px-5 py-2.5 rounded transition"
              >
                Редактировать
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}