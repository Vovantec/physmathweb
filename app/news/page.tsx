"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function NewsPage() {
  const [news, setNews] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null); // Состояние для хранения текущего пользователя
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Параллельно загружаем новости и сессию пользователя
    Promise.all([
      fetch("/api/news").then(res => res.json()),
      fetch("/api/auth/session").then(res => res.ok ? res.json() : null)
    ])
    .then(([newsData, sessionData]) => {
      setNews(newsData);
      
      // Если сессия есть и пользователь авторизован, сохраняем его
      if (sessionData && sessionData.user) {
        setUser(sessionData.user);
      }
      
      setLoading(false);
    })
    .catch(err => {
      console.error("Ошибка загрузки:", err);
      setLoading(false);
    });
  }, []);

  const handleLike = async (postId: number) => {
    // Если ученик не авторизован (не вошел через Telegram)
    if (!user || !user.id) {
      alert("Пожалуйста, авторизуйтесь на главной странице, чтобы ставить лайки!");
      return;
    }

    // Отправляем реальный ID пользователя (telegramId)
    const res = await fetch(`/api/news/${postId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id })
    });
    
    if (res.ok) {
      const data = await res.json(); 
      setNews(news.map(p => {
        if (p.id === postId) {
          return { 
             ...p, 
             _count: { 
               ...p._count, 
               likes: data.liked ? p._count.likes + 1 : p._count.likes - 1 
             }
          };
        }
        return p;
      }));
    } else {
      alert("Произошла ошибка при постановке лайка");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="p-8 text-center text-xl text-gray-600">Загрузка новостей...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      
      {/* КРАСИВАЯ ШАПКА ДЛЯ УЧЕНИКА */}
      <header className="bg-white shadow-sm mb-8">
        <div className="max-w-4xl mx-auto p-4 flex justify-between items-center">
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2">
            <span>←</span> На главную
          </Link>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800 hidden md:block">PhysMath Платформа</h2>
            
            {/* Показываем аватарку или имя пользователя, если он авторизован */}
            {user ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {user.photoUrl && <img src={user.photoUrl} alt="avatar" className="w-8 h-8 rounded-full" />}
                <span>{user.firstName}</span>
              </div>
            ) : (
              <span className="text-sm text-red-500 font-medium">Не авторизован</span>
            )}
          </div>
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ НОВОСТЕЙ */}
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Новости и Анонсы</h1>
        </div>
        
        <div className="space-y-6">
          {news.map((post) => {
            const tags = JSON.parse(post.tags || "[]");
            
            return (
              <div key={post.id} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-semibold text-gray-900">{post.title}</h2>
                  <span className="text-sm text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
                
                <div className="flex gap-2 mb-4">
                  {tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full cursor-pointer hover:bg-blue-200">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="prose max-w-none text-gray-700 mb-6 whitespace-pre-wrap">
                  {post.content}
                </div>

                <div className="flex items-center gap-6 border-t pt-4 text-gray-500">
                  <button 
                    onClick={() => handleLike(post.id)} 
                    className="flex items-center gap-2 hover:text-red-500 transition"
                  >
                    {/* Визуальная реакция: если пользователь авторизован, даем возможность лайкать */}
                    <span className={user ? "opacity-100" : "opacity-50 grayscale"}>❤️</span> 
                    {post._count.likes}
                  </button>
                  <button className="flex items-center gap-2 hover:text-blue-500 transition">
                    <span>💬</span> {post._count.comments} Комментариев
                  </button>
                  <span className="ml-auto text-sm text-gray-400">
                    Автор: {post.author?.firstName || "Администрация"}
                  </span>
                </div>
              </div>
            );
          })}
          
          {news.length === 0 && (
            <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
              Новостей пока нет.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}