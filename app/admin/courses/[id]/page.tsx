'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CourseManagerPage() {
  const { id } = useParams();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Формы
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newLesson, setNewLesson] = useState({ title: '', videoUrl: '', taskId: 0 });
  
  // Форма добавления задачи в ДЗ (с картинками и видео)
  const [newQuestion, setNewQuestion] = useState({ type: 'value', content: '', answer: '', videoUrl: '', imageUrl: '', lessonId: 0 });

  const fetchCourseData = async () => {
    // Берем данные из защищенного админского API, чтобы видеть ДЗ
    const res = await fetch(`/api/admin/courses/${id}`); 
    if (res.ok) {
        setCourse(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => { if(id) fetchCourseData(); }, [id]);

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

  const addQuestion = async (lessonId: number) => {
    if (!newQuestion.answer || newQuestion.lessonId !== lessonId) return;
    
    // Отправляем данные на наш новый API-роут
    await fetch('/api/admin/questions', {
      method: 'POST',
      body: JSON.stringify({ 
         type: newQuestion.type,
         content: newQuestion.content,
         answer: newQuestion.answer,
         videoUrl: newQuestion.videoUrl || null,
         imageUrl: newQuestion.imageUrl || null,
         lessonId: lessonId 
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Очищаем форму
    setNewQuestion({ type: 'value', content: '', answer: '', videoUrl: '', imageUrl: '', lessonId: 0 });
    fetchCourseData(); // Обновляем данные на странице
  };

  if (loading) return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white font-mono animate-pulse">
      ... ЗАГРУЗКА ДАННЫХ КУРСА ...
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
            href="/admin/courses" 
            className="inline-block mb-8 text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-white transition border-b border-transparent hover:border-white pb-1"
        >
          ← Назад к списку курсов
        </Link>

        {/* Заголовок курса */}
        <div className="bg-[#1a1a1a] border-2 border-white/10 rounded-xl p-8 mb-12 shadow-2xl relative overflow-hidden">
          <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight mb-4 text-yellow-400">
            {course.title}
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed border-l-4 border-white/20 pl-6 font-mono">
            {course.description}
          </p>
        </div>

        {/* Форма добавления Темы */}
        <div className="flex flex-col md:flex-row gap-4 mb-10 bg-[#1a1a1a] p-6 rounded-xl border border-white/10">
          <div className="flex-grow">
              <label className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">Создать новую тему</label>
              <input 
                className="w-full bg-black/40 border border-white/10 rounded p-4 text-white focus:border-yellow-400 focus:outline-none transition font-mono"
                placeholder="Название новой темы..." 
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
              />
          </div>
          <button 
            onClick={addTask} 
            className="self-end bg-white text-black font-extrabold uppercase tracking-widest px-8 py-4 rounded hover:bg-yellow-400 transition transform active:scale-95 whitespace-nowrap"
          >
            + Добавить
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold uppercase tracking-widest">Программа курса</h2>
            <div className="h-px bg-white/20 flex-grow"></div>
        </div>

        {/* Список Тем (Tasks) */}
        <div className="space-y-8">
          {course.tasks?.length === 0 && (
              <p className="text-gray-500 font-mono text-center py-10 border border-dashed border-white/10 rounded">
                  Темы еще не добавлены.
              </p>
          )}

          {course.tasks?.map((task: any, taskIndex: number) => (
            <div key={task.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8 shadow-2xl relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-white/20"></div>
              
              <div className="flex items-end mb-6 gap-3 border-b border-white/10 pb-4">
                 <span className="text-5xl font-black text-white/5 select-none leading-none -mb-1">
                    {String(taskIndex + 1).padStart(2, '0')}
                 </span>
                 <h2 className="font-bold text-2xl uppercase tracking-wider text-white mb-1">
                    {task.title}
                 </h2>
              </div>

              {/* Уроки внутри темы */}
              <div className="space-y-6 mb-8">
                {task.lessons?.length === 0 && (
                  <p className="text-gray-500 text-sm font-mono italic">Уроков пока нет</p>
                )}
                
                {task.lessons?.map((lesson: any) => (
                  <div key={lesson.id} className="bg-black/30 border border-white/5 rounded-lg p-6 group/lesson hover:border-white/20 transition">
                    
                    {/* Заголовок урока */}
                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                      <div className="flex items-center gap-3">
                          <span className="text-2xl">🎥</span>
                          <span className="font-medium font-mono text-lg text-gray-200">{lesson.title}</span>
                      </div>
                      <div className="text-xs font-mono text-gray-500 bg-white/5 px-3 py-1.5 rounded truncate max-w-xs border border-white/5">
                          {lesson.videoUrl ? `URL: ${lesson.videoUrl}` : 'Видео не прикреплено'}
                      </div>
                    </div>

                    {/* Домашнее задание (Вопросы) */}
                    <div className="pl-6 border-l-2 border-white/10 space-y-3 mb-6">
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Домашнее задание:</h4>
                      
                      {(!lesson.questions || lesson.questions.length === 0) ? (
                        <p className="text-gray-600 text-sm font-mono italic bg-white/5 p-3 rounded border border-dashed border-white/10">Задачи еще не добавлены</p>
                      ) : (
                        lesson.questions?.map((q: any, idx: number) => (
                          <div key={q.id} className="bg-[#1a1a1a] p-4 rounded border border-white/5 mb-3">
                            <div className="flex justify-between items-start mb-3">
                              <span className="font-bold text-yellow-400 text-sm tracking-wide">Задача {idx + 1}</span>
                              <div className="flex gap-2">
                                <span className="text-xs font-mono text-gray-400 bg-black/50 px-2 py-1 rounded">
                                  {q.type === 'option' ? 'ВЫБОР' : 'ВВОД'}
                                </span>
                                <span className="bg-green-500/10 text-green-400 font-mono text-xs px-2 py-1 rounded border border-green-500/20">
                                  Ответ: {q.answer}
                                </span>
                              </div>
                            </div>
                            
                            {/* Текст задачи */}
                            <div className="text-gray-300 font-mono text-sm mb-3 bg-black/30 p-3 rounded border border-white/5">{q.content}</div>
                            
                            {/* Картинка к задаче (если есть) */}
                            {q.imageUrl && (
                                <div className="mb-3">
                                    <img 
                                        src={q.imageUrl} 
                                        alt="Иллюстрация" 
                                        className="max-h-48 rounded-lg border border-white/10 shadow-md object-contain bg-black/50" 
                                    />
                                </div>
                            )}
                            
                            {/* Ссылка на видеоразбор */}
                            {q.videoUrl && (
                                <div className="text-xs text-blue-400 flex items-center gap-2 bg-blue-900/10 w-max px-3 py-1.5 rounded border border-blue-500/20">
                                    <span>▶ Разбор:</span> <a href={q.videoUrl} target="_blank" rel="noreferrer" className="underline hover:text-blue-300">{q.videoUrl}</a>
                                </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Форма добавления задачи в ДЗ */}
                    <div className="mt-4 p-5 bg-white/5 rounded-lg border border-dashed border-white/10 ml-6">
                      <span className="block text-xs font-mono text-gray-400 uppercase tracking-widest mb-4">Добавить задачу в ДЗ</span>
                      <div className="flex flex-col gap-4">
                          <div className="flex flex-col md:flex-row gap-3">
                              <select 
                                  className="bg-black/40 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none transition font-mono text-sm"
                                  value={newQuestion.lessonId === lesson.id ? newQuestion.type : 'value'}
                                  onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value, lessonId: lesson.id })}
                              >
                                  <option value="value">Ввод значения</option>
                                  <option value="option">Выбор (1-4)</option>
                              </select>
                              <input 
                                  className="flex-grow bg-black/40 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none transition font-mono text-sm"
                                  placeholder="Текст задачи..."
                                  value={newQuestion.lessonId === lesson.id ? newQuestion.content : ''}
                                  onChange={e => setNewQuestion({ ...newQuestion, content: e.target.value, lessonId: lesson.id })}
                              />
                              <input 
                                  className="w-full md:w-32 bg-black/40 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none transition font-mono text-sm"
                                  placeholder="Ответ"
                                  value={newQuestion.lessonId === lesson.id ? newQuestion.answer : ''}
                                  onChange={e => setNewQuestion({ ...newQuestion, answer: e.target.value, lessonId: lesson.id })}
                              />
                          </div>
                          
                          <div className="flex flex-col md:flex-row gap-3">
                              <input 
                                  className="flex-grow bg-black/40 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none transition font-mono text-sm"
                                  placeholder="Ссылка на видеоразбор (YouTube URL)"
                                  value={newQuestion.lessonId === lesson.id ? newQuestion.videoUrl : ''}
                                  onChange={e => setNewQuestion({ ...newQuestion, videoUrl: e.target.value, lessonId: lesson.id })}
                              />
                              <input 
                                  className="flex-grow bg-black/40 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none transition font-mono text-sm border-l-4 border-l-blue-500"
                                  placeholder="Ссылка на картинку (URL)"
                                  value={newQuestion.lessonId === lesson.id ? newQuestion.imageUrl : ''}
                                  onChange={e => setNewQuestion({ ...newQuestion, imageUrl: e.target.value, lessonId: lesson.id })}
                              />
                          </div>

                          {/* Предпросмотр картинки при вставке ссылки */}
                          {newQuestion.lessonId === lesson.id && newQuestion.imageUrl && (
                              <div className="relative w-max mt-2">
                                  <span className="text-xs text-black bg-yellow-400 px-2 py-0.5 rounded-t-lg absolute -top-5 left-0 font-bold font-mono">
                                      Предпросмотр
                                  </span>
                                  <img 
                                      src={newQuestion.imageUrl} 
                                      alt="preview" 
                                      className="max-h-40 rounded-b-lg rounded-tr-lg border-2 border-yellow-400/50 object-contain bg-black/80" 
                                      onError={(e) => e.currentTarget.style.display = 'none'}
                                  />
                              </div>
                          )}

                          <button 
                              onClick={() => addQuestion(lesson.id)}
                              className="bg-white/10 text-white font-bold uppercase tracking-widest text-xs px-6 py-3 rounded hover:bg-yellow-400 hover:text-black transition whitespace-nowrap border border-white/20 hover:border-yellow-400 w-full md:w-max self-end mt-2"
                          >
                              Сохранить задачу
                          </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Форма добавления Урока */}
              <div className="bg-white/5 p-6 rounded-xl border border-dashed border-white/20 mt-6">
                <span className="block text-xs font-mono text-white uppercase tracking-widest mb-4">Создать новый урок в теме</span>
                <div className="flex flex-col md:flex-row gap-3">
                  <input 
                    className="flex-grow bg-black/40 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none transition font-mono text-sm"
                    placeholder="Название урока"
                    value={newLesson.taskId === task.id ? newLesson.title : ''}
                    onChange={e => setNewLesson({ ...newLesson, title: e.target.value, taskId: task.id })}
                  />
                  <input 
                    className="flex-grow bg-black/40 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none transition font-mono text-sm"
                    placeholder="Ссылка на лекцию (YouTube URL)"
                    value={newLesson.taskId === task.id ? newLesson.videoUrl : ''}
                    onChange={e => setNewLesson({ ...newLesson, videoUrl: e.target.value, taskId: task.id })}
                  />
                  <button 
                    onClick={() => addLesson(task.id)}
                    className="bg-white text-black font-extrabold uppercase tracking-widest text-xs px-8 py-3 rounded hover:bg-yellow-400 transition transform active:scale-95 whitespace-nowrap"
                  >
                    Добавить урок
                  </button>
                </div>
              </div>
              
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}