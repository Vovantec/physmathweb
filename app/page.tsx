"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import BotLogin from './components/BotLogin';

interface Course {
  id: number;
  title: string;
  description: string | null;
}

interface UserData {
  id: string;
  name?: string;
  photo?: string;
  isAdmin?: boolean;
}

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem('user_id');
    const storedName = localStorage.getItem('user_name');
    const storedPhoto = localStorage.getItem('user_photo');
    const storedIsAdmin = localStorage.getItem('user_is_admin') === 'true';

    if (storedId) {
        setUser({ 
            id: storedId, 
            name: storedName || undefined, 
            photo: storedPhoto || undefined,
            isAdmin: storedIsAdmin
        });
        
        fetch('/api/courses')
          .then((res) => {
            if (!res.ok) throw new Error('Ошибка сети');
            return res.json();
          })
          .then((data) => {
            setCourses(data);
            setLoading(false);
          })
          .catch((err) => {
            console.error(err);
            setLoading(false);
          });
    } else {
        setLoading(false);
    }
    setAuthChecked(true);
  }, []);

  const handleAuth = (userData: any) => {
      // 1. Сохраняем весь объект пользователя для страницы /game
      localStorage.setItem('user', JSON.stringify(userData)); 

      // 2. Сохраняем отдельные поля для текущей страницы (оставьте как есть для совместимости)
      localStorage.setItem('user_id', userData.id);
      if (userData.name) localStorage.setItem('user_name', userData.name);
      if (userData.photo) localStorage.setItem('user_photo', userData.photo);
      localStorage.setItem('user_is_admin', userData.isAdmin ? 'true' : 'false');
      
      setUser(userData);
      
      setLoading(true);
      fetch('/api/courses')
        .then((res) => res.json())
        .then((data) => {
            setCourses(data);
            setLoading(false);
        });
  };

  const handleLogout = () => {
      localStorage.clear();
      setUser(null);
      setCourses([]);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-8 bg-[#121212] text-white">
      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mb-16 border-b border-white/20 pb-6">
        <div className="flex items-center gap-3">
            <span className="text-4xl">⚛️</span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter uppercase font-sans">
                PHYSICS <span className="text-gray-500">&</span> MATH
            </h1>
        </div>
        
        <div className="flex gap-6 items-center mt-6 md:mt-0">
            {/* Показываем кнопку админки только если user.isAdmin === true */}
            {user?.isAdmin && (
                <Link 
                  href="/admin" 
                  className="text-gray-400 hover:text-white transition font-bold uppercase text-sm tracking-widest border border-transparent hover:border-white/20 px-4 py-2 rounded"
                >
                    Админ-панель
                </Link>
            )}

            {user ? (
                <div className="flex items-center gap-4 bg-[#1a1a1a] border border-white/20 px-5 py-2 rounded-full shadow-lg">
                  {user.photo && <img src={user.photo} alt="ava" className="w-8 h-8 rounded-full ring-2 ring-white/50" />}
                  <span className="font-bold text-gray-200">
                      {user.name || `ID: ${user.id}`}
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-wider ml-2"
                  >
                    Выйти
                  </button>
                </div>
            ) : (
                // Показываем кнопку Telegram вместо обычной кнопки
                <div className="h-[40px]"> 
                    <BotLogin onAuth={handleAuth} />
                </div>
                /*<div className="opacity-50 pointer-events-none grayscale">
                    <div className="h-[40px] w-[150px] bg-white/10 rounded"></div>
                </div>*/
            )}
        </div>
      </header>

      <main className="w-full max-w-6xl flex-grow flex flex-col">
        {!authChecked || (loading && user) ? (
           <div className="flex justify-center py-20 flex-grow items-center">
               <div className="text-center">
                   <div className="inline-block w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                   <p className="text-xl text-gray-400 font-mono tracking-widest">ЗАГРУЗКА ДАННЫХ...</p>
               </div>
           </div>
        ) : !user ? (
           <div className="flex-grow flex items-center justify-center py-10">
               <div className="max-w-lg w-full bg-[#1a1a1a] border-2 border-dashed border-white/20 p-10 rounded-xl text-center shadow-2xl relative overflow-hidden">
                   <div className="absolute inset-0 opacity-5 pointer-events-none" 
                        style={{backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px'}}>
                   </div>
                   
                   <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/5 mb-6 ring-1 ring-white/20">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                   </div>
                   
                   <h2 className="text-3xl font-extrabold uppercase tracking-tight mb-4">Доступ закрыт</h2>
                   <p className="text-gray-400 mb-8 font-mono text-sm leading-relaxed">
                       Материалы курса доступны только зарегистрированным студентам. Пожалуйста, авторизуйтесь через Telegram, чтобы войти в лабораторию.
                   </p>
                   
                   <div className="flex justify-center transform scale-110">
                        <BotLogin onAuth={handleAuth} />
                   </div>
               </div>
           </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-xl">
            <p className="text-gray-400 text-xl font-mono">Курсы пока не добавлены.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-10">
                <div className="h-1 bg-white flex-grow opacity-20 rounded"></div>
                <h2 className="text-3xl font-bold uppercase tracking-widest text-center">Доступные Курсы</h2>
                <div className="h-1 bg-white flex-grow opacity-20 rounded"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.map((course) => (
                <div key={course.id} className="group relative bg-[#1a1a1a] border-2 border-white/10 p-8 rounded-xl hover:border-white transition duration-300 flex flex-col shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                    </div>

                    <h3 className="text-2xl font-bold mb-4 text-white uppercase tracking-tight group-hover:text-yellow-400 transition">{course.title}</h3>
                    <p className="text-gray-400 mb-8 flex-grow leading-relaxed font-mono text-sm border-l-2 border-white/10 pl-4">
                        {course.description || "Описание отсутствует..."}
                    </p>
                    
                    <Link 
                        href={`/course/${course.id}`}
                        className="mt-auto w-full text-center bg-white text-black font-extrabold uppercase tracking-widest px-6 py-4 rounded hover:bg-yellow-400 hover:text-black transition transform active:scale-95"
                    >
                    Начать
                    </Link>
                </div>
                ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}