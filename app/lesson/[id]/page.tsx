"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Question {
  id: number;
  type: string;
  content: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
}

interface Attempt {
  id: number;
  percent: number;
  correct: number;
  total: number;
  pointsGained?: number;
  bonusGained?: boolean;
  createdAt: string;
}

interface LessonData {
  id: number;
  title: string;
  videoUrl: string | null;
  pdfId: string | null;
  task: { courseId: number };
  questions: Question[];
  attempts: Attempt[];
}

export default function LessonPage() {
  const { id } = useParams();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [user, setUser] = useState<{id: string} | null>(null);
  
  // Состояние для вкладок видеоразборов
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  useEffect(() => {
    const storedId = localStorage.getItem('user_id');
    if(storedId) setUser({ id: storedId });

    if (id && storedId) {
      fetch(`/api/lessons/${id}?userId=${storedId}`)
        .then(r => r.json())
        .then(data => {
            setLesson(data);
            
            if (data.attempts && data.attempts.length > 0) {
                const bestAttempt = data.attempts.reduce((prev: Attempt, current: Attempt) => 
                    (prev.percent > current.percent) ? prev : current
                );
                
                const isPerfect = bestAttempt.percent === 100;
                const isExhausted = data.attempts.length >= 2;

                if (isPerfect || isExhausted) {
                    setResult({
                        percent: bestAttempt.percent,
                        correct: bestAttempt.correct,
                        total: bestAttempt.total,
                        pointsGained: 0, 
                        bonusGained: false,
                        isHistory: true
                    });
                }
            }
            
            setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [id]);

  const handleSubmit = async () => {
    if (!lesson || !user) return;
    setSubmitting(true);
    
    try {
        const res = await fetch(`/api/lessons/${lesson.id}/submit`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                userId: user.id,
                answers: answers
            })
        });
        
        const data = await res.json();
        if (data.success) {
            setResult(data.results);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            setLesson(prev => prev ? {
                ...prev,
                attempts: [...prev.attempts, {
                    id: Date.now(),
                    percent: data.results.percent,
                    correct: data.results.correct,
                    total: data.results.total,
                    createdAt: new Date().toISOString()
                }]
            } : null);
        } else {
            alert(data.error || "Ошибка отправки");
        }
    } catch (e) {
        alert("Ошибка сети");
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white font-mono animate-pulse">
        ... ЗАГРУЗКА УРОКА ...
      </div>
  );

  if (!lesson) return <div className="p-12 text-white">Урок не найден или вы не авторизованы.</div>;

  const courseId = lesson.task?.courseId;
  const attemptsCount = lesson.attempts?.length || 0;
  const maxAttempts = 2;
  
  const bestPercent = lesson.attempts?.reduce((max, a) => Math.max(max, a.percent), 0) || 0;
  
  // Логика доступов
  const canSolve = attemptsCount < maxAttempts && bestPercent < 100; 
  const showVideos = attemptsCount >= maxAttempts || bestPercent === 100;

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link 
            href={courseId ? `/course/${courseId}` : '/'} 
            className="inline-block mb-8 text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-white transition border-b border-transparent hover:border-white pb-1"
        >
          ← Вернуться к курсу
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight mb-8">
            <span className="text-yellow-400 mr-3">#</span>
            {lesson.title}
        </h1>
        
        {/* Блок результата */}
        {result && (
            <div className={`mb-10 border p-6 rounded-xl animate-in fade-in slide-in-from-top-4 shadow-xl ${result.percent === 100 ? 'bg-green-900/30 border-green-500/50' : 'bg-blue-900/30 border-blue-500/50'}`}>
                <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                    <div>
                        <h3 className={`text-2xl font-bold mb-2 ${result.percent === 100 ? 'text-green-400' : 'text-blue-400'}`}>
                            {result.percent === 100 ? '✅ Задание выполнено!' : `🏁 Результат: ${result.percent}%`}
                        </h3>
                        <p className="text-lg text-gray-300 font-mono">Правильно: {result.correct} из {result.total}</p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                        {result.isHistory && (
                            <div className="text-xs font-mono uppercase border border-white/20 px-3 py-1 rounded opacity-50 bg-black/20">
                                Выполнено ранее
                            </div>
                        )}

                        {/* Кнопка "Попробовать еще раз" без перезагрузки */}
                        {result.percent < 100 && attemptsCount < maxAttempts && !result.isHistory && (
                            <button 
                                onClick={() => {
                                    setResult(null); // Возвращаем форму
                                    setAnswers({});  // Очищаем старые ответы
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold font-mono text-sm px-5 py-2.5 rounded transition border border-blue-500/50 shadow-lg flex items-center gap-2"
                            >
                                Попробовать еще раз ↻
                            </button>
                        )}
                    </div>
                </div>

                {!result.isHistory && result.pointsGained > 0 && (
                    <div className="mt-4 inline-block bg-yellow-500/20 text-yellow-300 px-4 py-2 rounded-lg font-bold border border-yellow-500/30">
                        🎉 Начислено баллов: +{result.pointsGained}
                        {result.bonusGained && <span className="block text-xs font-normal opacity-80">(включая бонус за идеал!)</span>}
                    </div>
                )}
            </div>
        )}

        {/* Блок разборов задач (Видео) - Отображается только если нет попыток или 100% */}
        {showVideos && lesson.questions && lesson.questions.length > 0 && (
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 md:p-8 mb-10 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <div className="flex items-center gap-3 mb-6">
                    <span className="text-2xl">📺</span>
                    <h3 className="text-xl font-bold uppercase tracking-widest text-white">Разбор задач</h3>
                </div>
                
                {/* Горизонтальный список задач */}
                <div className="flex overflow-x-auto gap-3 pb-4 mb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {lesson.questions.map((q, idx) => (
                        <button
                            key={q.id}
                            onClick={() => setSelectedQuestionIndex(idx)}
                            className={`flex-shrink-0 px-6 py-3 rounded-lg font-bold border transition whitespace-nowrap ${
                                selectedQuestionIndex === idx 
                                ? 'bg-yellow-400 text-black border-yellow-400' 
                                : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/50 hover:text-white'
                            }`}
                        >
                            Задача {idx + 1}
                        </button>
                    ))}
                </div>

                {/* Плеер для выбранной задачи */}
                <div className="relative aspect-video bg-black border-2 border-white/20 rounded-xl flex items-center justify-center overflow-hidden shadow-2xl mt-4">
                    {lesson.questions[selectedQuestionIndex]?.videoUrl ? (
                        <iframe 
                            src={lesson.questions[selectedQuestionIndex].videoUrl!.replace('watch?v=', 'embed/')} 
                            className="w-full h-full absolute inset-0" 
                            allowFullScreen 
                            title={`Разбор задачи ${selectedQuestionIndex + 1}`}
                        />
                    ) : (
                        <div className="text-gray-500 font-mono text-center px-4">
                            Видеоразбор для этой задачи еще не добавлен преподавателем.
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Видео Лекции */}
        {lesson.videoUrl && (
          <div className="relative aspect-video bg-black border-2 border-white/20 rounded-xl mb-8 flex items-center justify-center overflow-hidden shadow-2xl">
             <iframe 
                src={lesson.videoUrl.replace('watch?v=', 'embed/')} 
                className="w-full h-full" 
                allowFullScreen 
                title="Video"
             />
          </div>
        )}

        {/* Файл PDF */}
        {lesson.pdfId && (
            <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-xl mb-8 flex items-center justify-between group hover:border-blue-500/50 transition">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white">Материалы к уроку</h3>
                        <p className="text-sm text-gray-500 font-mono">Документ PDF</p>
                    </div>
                </div>
                <a 
                    href={`/api/files/${lesson.pdfId}`}
                    target="_blank"
                    download
                    className="flex items-center gap-2 px-5 py-3 bg-white text-black font-bold uppercase tracking-widest text-xs rounded hover:bg-yellow-400 transition transform active:scale-95"
                >
                    <span>Скачать</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </a>
            </div>
        )}

        {/* Блок Домашнего задания */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-white/10 gap-4">
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-3">
                    <span>📝</span> Домашнее задание
                </h2>
                <p className="text-gray-500 mt-1 text-sm font-mono">
                    Попытка {Math.min(attemptsCount + 1, maxAttempts)} из {maxAttempts}
                </p>
              </div>
              
              <div className="flex gap-2">
                  {lesson.attempts.map((att, idx) => (
                      <div key={idx} className={`px-3 py-1 rounded border text-xs font-bold ${att.percent === 100 ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
                          #{idx + 1}: {att.percent}%
                      </div>
                  ))}
              </div>
          </div>

          {/* ЛОГИКА ОТОБРАЖЕНИЯ ФОРМЫ */}
          {!canSolve || (result && !result.isHistory) ? (
              <div className="text-center py-8 opacity-50">
                  <p className="text-gray-400 font-mono text-lg">
                      {bestPercent === 100 
                        ? "Вы успешно завершили это задание." 
                        : attemptsCount >= maxAttempts 
                        ? "Вы использовали все попытки."
                        : "Для повторного решения нажмите «Попробовать еще раз» в блоке результатов выше."}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Форма ввода ответов скрыта.</p>
              </div>
          ) : (
            <div className="space-y-8">
                {lesson.questions.length === 0 ? (
                    <p className="text-gray-500 italic text-center">Вопросов нет.</p>
                ) : (
                    lesson.questions.map((q, idx) => (
                    <div key={q.id} className="relative">
                        <span className="absolute -left-3 -top-3 text-6xl font-black text-white/5 select-none -z-10">
                            {idx + 1}
                        </span>
                        
                        <div className="mb-4">
                            <p className="font-medium text-lg text-gray-200">
                                <div className="mb-4">
                                    <p className="font-medium text-lg text-gray-200">
                                        {q.content || `Вопрос №${idx + 1}`}
                                    </p>
                                    
                                    {/* ОТОБРАЖЕНИЕ КАРТИНКИ СТУДЕНТУ */}
                                    {q.imageUrl && (
                                        <div className="mt-4 mb-2">
                                            <img 
                                                src={q.imageUrl} 
                                                alt={`Иллюстрация к задаче ${idx + 1}`} 
                                                className="max-h-96 rounded-xl border border-white/10 shadow-2xl object-contain bg-black/40" 
                                            />
                                        </div>
                                    )}

                                    <span className="text-xs font-mono text-gray-500 bg-black/30 px-2 py-1 rounded inline-block mt-2">
                                        {q.type === 'option' ? 'ВЫБОР ВАРИАНТА' : 'ВВОД ЗНАЧЕНИЯ'}
                                    </span>
                                </div>
                            </p>
                            <span className="text-xs font-mono text-gray-500 bg-black/30 px-2 py-1 rounded inline-block mt-2">
                                {q.type === 'option' ? 'ВЫБОР ВАРИАНТА' : 'ВВОД ЗНАЧЕНИЯ'}
                            </span>
                        </div>

                        {q.type === 'option' ? (
                            <div className="grid grid-cols-2 gap-4 max-w-md">
                                {[1, 2, 3, 4].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => setAnswers({...answers, [q.id]: opt.toString()})}
                                        className={`p-4 rounded border font-bold text-xl transition ${
                                            answers[q.id] === opt.toString() 
                                            ? 'bg-yellow-400 text-black border-yellow-400' 
                                            : 'bg-black/40 border-white/10 hover:border-white/50 text-gray-400'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <input 
                                type="text"
                                placeholder="Введите ответ..."
                                value={answers[q.id] || ''}
                                onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                                className="w-full max-w-md bg-black/40 border border-white/10 rounded p-4 text-white focus:border-yellow-400 focus:outline-none transition font-mono"
                            />
                        )}
                    </div>
                    ))
                )}

                {lesson.questions.length > 0 && (
                    <div className="pt-8 border-t border-white/10 flex justify-end">
                        <button 
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-white text-black font-extrabold uppercase tracking-widest px-8 py-4 rounded hover:bg-yellow-400 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Проверка...' : 'Отправить на проверку'}
                        </button>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}