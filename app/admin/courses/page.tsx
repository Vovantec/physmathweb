'use client';
import { useState, useEffect } from 'react';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [newCourse, setNewCourse] = useState({ title: '', description: '' });

  // Загрузка курсов
  const fetchCourses = async () => {
    const res = await fetch('/api/admin/courses'); // GET метод (надо добавить в route.ts выше)
    if (res.ok) setCourses(await res.json());
  };

  useEffect(() => { fetchCourses(); }, []);

  // Создание курса
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.title) return;

    await fetch('/api/admin/courses', {
      method: 'POST',
      body: JSON.stringify(newCourse),
    });
    
    setNewCourse({ title: '', description: '' });
    fetchCourses();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Управление курсами</h1>
      
      {/* Форма создания */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8 max-w-2xl">
        <h2 className="text-xl mb-4">Добавить новый курс</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            type="text"
            placeholder="Название курса"
            className="w-full p-2 bg-gray-700 rounded text-white"
            value={newCourse.title}
            onChange={e => setNewCourse({...newCourse, title: e.target.value})}
          />
          <textarea
            placeholder="Описание"
            className="w-full p-2 bg-gray-700 rounded text-white"
            value={newCourse.description}
            onChange={e => setNewCourse({...newCourse, description: e.target.value})}
          />
          <button type="submit" className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500">
            Создать курс
          </button>
        </form>
      </div>

      {/* Список курсов */}
      <div className="grid gap-4">
        {courses.map(course => (
          <div key={course.id} className="bg-gray-800 p-4 rounded border border-gray-700 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">{course.title}</h3>
              <p className="text-gray-400 text-sm">{course.description}</p>
            </div>
            <a 
              href={`/admin/courses/${course.id}`} 
              className="bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500"
            >
              Управлять задачами →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}