'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function CourseManagerPage() {
  const { id } = useParams();
  const [course, setCourse] = useState<any>(null);
  
  // Формы
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newLesson, setNewLesson] = useState({ title: '', videoUrl: '', taskId: 0 });
  
  // Форма добавления задачи к уроку (с полем для видеоразбора)
  const [newQuestion, setNewQuestion] = useState({ type: 'value', content: '', answer: '', videoUrl: '', lessonId: 0 });

  const fetchCourseData = async () => {
    const res = await fetch(`/api/courses/${id}`); 
    if (res.ok) setCourse(await res.json());
  };

  useEffect(() => { if(id) fetchCourseData(); }, [id]);

  // Добавить задачу (Task / Тема)
  const addTask = async () => {
    if (!newTaskTitle) return;
    await fetch('/api/admin/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: newTaskTitle, courseId: Number(id) }),
      headers: { 'Content-Type': 'application/json' }
    });
    setNewTaskTitle('');
    fetchCourseData();
  };

  // Добавить урок (Lesson)
  const addLesson = async (taskId: number) => {
    if (!newLesson.title || newLesson.taskId !== taskId) return;
    
    await fetch('/api/admin/lessons', {
      method: 'POST',
      body: JSON.stringify({ ...newLesson, taskId }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    setNewLesson({ title: '', videoUrl: '', taskId: 0 });
    fetchCourseData();
  };

  // Добавить вопрос/задачу в ДЗ (Question)
  const addQuestion = async (lessonId: number) => {
    if (!newQuestion.answer || newQuestion.lessonId !== lessonId) return;
    
    await fetch('/api/admin/questions', { // <--- Убедитесь, что у вас создан этот API-роут
      method: 'POST',
      body: JSON.stringify({ 
         type: newQuestion.type,
         content: newQuestion.content,
         answer: newQuestion.answer,
         videoUrl: newQuestion.videoUrl || null,
         lessonId: lessonId 
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    setNewQuestion({ type: 'value', content: '', answer: '', videoUrl: '', lessonId: 0 });
    fetchCourseData();
  };

  if (!course) return <div className="p-8 text-white">Загрузка данных курса...</div>;

  return (
    <div className="p-4 md:p-8 text-white max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
      <p className="text-gray-400 mb-8">{course.description}</p>

      {/* Секция добавления задачи (Темы) */}
      <div className="mb-8 flex gap-2">
        <input 
          className="bg-gray-800 p-2 rounded text-white w-64 border border-gray-700 focus:border-green-500 outline-none transition"
          placeholder="Название новой темы/задачи" 
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
        />
        <button onClick={addTask} className="bg-green-600 px-4 py-2 rounded hover:bg-green-500 font-bold transition">
          + Добавить тему
        </button>
      </div>

      {/* Список тем (Tasks) */}
      <div className="space-y-8">
        {course.tasks?.map((task: any) => (
          <div key={task.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">{task.title}</h2>

            {/* Список уроков внутри темы */}
            <div className="space-y-6 mb-6">
              {task.lessons?.map((lesson: any) => (
                <div key={lesson.id} className="bg-gray-900 border border-gray-700 p-5 rounded-lg">
                  
                  {/* Заголовок урока */}
                  <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
                    <span className="font-bold text-lg text-white">🎥 {lesson.title}</span>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">{lesson.videoUrl || 'Нет видео для урока'}</span>
                  </div>

                  {/* Список задач для ДЗ */}
                  <div className="pl-4 border-l-2 border-gray-800 space-y-3 mb-6">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Задачи в ДЗ:</h4>
                    
                    {lesson.questions?.map((q: any, idx: number) => (
                      <div key={q.id} className="bg-gray-800 p-3 rounded border border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-yellow-500 text-sm">Задача {idx + 1} ({q.type === 'option' ? 'Выбор' : 'Ввод'})</span>
                          <span className="bg-green-900/40 text-green-400 text-xs px-2 py-1 rounded border border-green-800/50">Ответ: {q.answer}</span>
                        </div>
                        <div className="text-gray-300 text-sm mb-2">{q.content}</div>
                        {q.videoUrl && (
                            <div className="text-xs text-blue-400 flex items-center gap-1 mt-2 bg-blue-900/20 w-max px-2 py-1 rounded">
                                <span>▶ Видеоразбор:</span> <a href={q.videoUrl} target="_blank" rel="noreferrer" className="underline">{q.videoUrl}</a>
                            </div>
                        )}
                      </div>
                    ))}
                    
                    {(!lesson.questions || lesson.questions.length === 0) && (
                      <p className="text-gray-500 text-sm italic">Задачи еще не добавлены</p>
                    )}
                  </div>

                  {/* Форма добавления задачи в ДЗ */}
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 border-dashed ml-4">
                    <span className="block text-sm font-bold text-gray-400 mb-3">Добавить задачу в ДЗ:</span>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row gap-2">
                            <select 
                                className="bg-gray-900 p-2 rounded text-white text-sm border border-gray-600 focus:border-blue-500 outline-none"
                                value={newQuestion.lessonId === lesson.id ? newQuestion.type : 'value'}
                                onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value, lessonId: lesson.id })}
                            >
                                <option value="value">Ввод значения</option>
                                <option value="option">Выбор варианта (1-4)</option>
                            </select>
                            <input 
                                className="bg-gray-900 p-2 rounded text-white text-sm flex-grow border border-gray-600 focus:border-blue-500 outline-none"
                                placeholder="Текст задачи..."
                                value={newQuestion.lessonId === lesson.id ? newQuestion.content : ''}
                                onChange={e => setNewQuestion({ ...newQuestion, content: e.target.value, lessonId: lesson.id })}
                            />
                            <input 
                                className="bg-gray-900 p-2 rounded text-white text-sm w-full md:w-32 border border-gray-600 focus:border-blue-500 outline-none"
                                placeholder="Ответ"
                                value={newQuestion.lessonId === lesson.id ? newQuestion.answer : ''}
                                onChange={e => setNewQuestion({ ...newQuestion, answer: e.target.value, lessonId: lesson.id })}
                            />
                        </div>
                        <div className="flex flex-col md:flex-row gap-2">
                            <input 
                                className="bg-gray-900 p-2 rounded text-white text-sm flex-grow border border-gray-600 focus:border-blue-500 outline-none"
                                placeholder="Ссылка на видеоразбор (YouTube URL) — необязательно"
                                value={newQuestion.lessonId === lesson.id ? newQuestion.videoUrl : ''}
                                onChange={e => setNewQuestion({ ...newQuestion, videoUrl: e.target.value, lessonId: lesson.id })}
                            />
                            <button 
                                onClick={() => addQuestion(lesson.id)}
                                className="bg-blue-600 px-6 py-2 rounded text-sm font-bold hover:bg-blue-500 transition whitespace-nowrap shadow-lg w-full md:w-auto"
                            >
                                Сохранить задачу
                            </button>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
              {task.lessons?.length === 0 && <p className="text-gray-500 text-sm">Нет уроков в этой теме</p>}
            </div>

            {/* Форма добавления урока к теме */}
            <div className="bg-gray-700/30 p-4 rounded-lg flex flex-col md:flex-row gap-3 items-center border border-gray-600">
              <span className="text-sm font-bold text-gray-300 whitespace-nowrap">Новый урок:</span>
              <input 
                className="bg-gray-900 p-2 rounded text-white text-sm flex-grow border border-gray-600 focus:border-purple-500 outline-none"
                placeholder="Название урока"
                value={newLesson.taskId === task.id ? newLesson.title : ''}
                onChange={e => setNewLesson({ ...newLesson, title: e.target.value, taskId: task.id })}
              />
              <input 
                className="bg-gray-900 p-2 rounded text-white text-sm flex-grow border border-gray-600 focus:border-purple-500 outline-none"
                placeholder="Ссылка на лекцию (YouTube URL)"
                value={newLesson.taskId === task.id ? newLesson.videoUrl : ''}
                onChange={e => setNewLesson({ ...newLesson, videoUrl: e.target.value, taskId: task.id })}
              />
              <button 
                onClick={() => addLesson(task.id)}
                className="bg-purple-600 px-6 py-2 rounded text-sm font-bold hover:bg-purple-500 transition shadow-lg w-full md:w-auto"
              >
                Добавить урок
              </button>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
}