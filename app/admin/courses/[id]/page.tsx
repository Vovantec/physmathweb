'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function CourseManagerPage() {
  const { id } = useParams();
  const [course, setCourse] = useState<any>(null);
  
  // Формы
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newLesson, setNewLesson] = useState({ title: '', videoUrl: '', taskId: 0 });

  const fetchCourseData = async () => {
    // Используем публичный API для получения структуры, либо делаем новый админский
    const res = await fetch(`/api/courses/${id}`); 
    if (res.ok) setCourse(await res.json());
  };

  useEffect(() => { if(id) fetchCourseData(); }, [id]);

  // Добавить задачу
  const addTask = async () => {
    if (!newTaskTitle) return;
    await fetch('/api/admin/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: newTaskTitle, courseId: id }),
    });
    setNewTaskTitle('');
    fetchCourseData();
  };

  // Добавить урок
  const addLesson = async (taskId: number) => {
    if (!newLesson.title || newLesson.taskId !== taskId) return;
    
    await fetch('/api/admin/lessons', {
      method: 'POST',
      body: JSON.stringify({ ...newLesson, taskId }),
    });
    
    setNewLesson({ title: '', videoUrl: '', taskId: 0 });
    fetchCourseData();
  };

  if (!course) return <div>Загрузка...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
      <p className="text-gray-400 mb-8">{course.description}</p>

      {/* Секция добавления задачи */}
      <div className="mb-8 flex gap-2">
        <input 
          className="bg-gray-700 p-2 rounded text-white w-64"
          placeholder="Название новой задачи (темы)" 
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
        />
        <button onClick={addTask} className="bg-green-600 px-4 py-2 rounded hover:bg-green-500">
          + Добавить задачу
        </button>
      </div>

      {/* Список задач */}
      <div className="space-y-6">
        {course.tasks?.map((task: any) => (
          <div key={task.id} className="bg-gray-800 border border-gray-700 rounded p-4">
            <h2 className="text-xl font-bold text-purple-300 mb-4">{task.title}</h2>

            {/* Список уроков */}
            <div className="pl-4 space-y-2 mb-4">
              {task.lessons?.map((lesson: any) => (
                <div key={lesson.id} className="flex justify-between items-center bg-gray-900 p-2 rounded">
                  <span>🎥 {lesson.title}</span>
                  <span className="text-xs text-gray-500">{lesson.videoUrl || 'Нет видео'}</span>
                </div>
              ))}
              {task.lessons?.length === 0 && <p className="text-gray-500 text-sm">Нет уроков</p>}
            </div>

            {/* Форма добавления урока */}
            <div className="pl-4 bg-gray-700/50 p-3 rounded flex gap-2 items-center">
              <span className="text-sm font-bold text-gray-400">Новый урок:</span>
              <input 
                className="bg-gray-900 p-1 rounded text-white text-sm"
                placeholder="Название"
                value={newLesson.taskId === task.id ? newLesson.title : ''}
                onChange={e => setNewLesson({ ...newLesson, title: e.target.value, taskId: task.id })}
              />
              <input 
                className="bg-gray-900 p-1 rounded text-white text-sm"
                placeholder="Ссылка на видео"
                value={newLesson.taskId === task.id ? newLesson.videoUrl : ''}
                onChange={e => setNewLesson({ ...newLesson, videoUrl: e.target.value, taskId: task.id })}
              />
              <button 
                onClick={() => addLesson(task.id)}
                className="bg-purple-600 px-3 py-1 rounded text-sm hover:bg-purple-500"
              >
                Добавить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}