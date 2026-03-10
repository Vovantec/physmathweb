"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminNewsPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    // Загружаем текущие новости для списка
    fetch("/api/admin/news")
      .then(res => res.json())
      .then(data => {
        setNews(data);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, []);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return alert("Заполните заголовок и контент!");
    
    setLoading(true);
    try {
      // Отправляем запрос на создание новости
      const res = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          content, 
          tags: JSON.stringify(tags), // Отправляем как JSON строку, как требует схема
          authorId: localStorage.getItem('user_id') 
        }),
      });

      if (res.ok) {
        alert("Новость успешно опубликована!");
        setTitle("");
        setContent("");
        setTags([]);
        // Обновляем список
        const newPost = await res.json();
        setNews([newPost, ...news]);
      } else {
        alert("Ошибка при публикации новости");
      }
    } catch (error) {
      console.error(error);
      alert("Сбой сети");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Точно удалить новость?")) return;
    
    // Предполагается, что в API есть метод DELETE
    const res = await fetch(`/api/admin/news?id=${id}`, { method: "DELETE" });
    if(res.ok) {
      setNews(news.filter(n => n.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        
        {/* Шапка админки */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <Link href="/admin" className="text-gray-400 hover:text-white transition text-sm font-bold uppercase flex items-center gap-2 mb-2">
              <span>←</span> В админ-панель
            </Link>
            <h1 className="text-3xl font-extrabold uppercase tracking-tight">Управление <span className="text-yellow-400">Новостями</span></h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* ЛЕВАЯ КОЛОНКА: ФОРМА СОЗДАНИЯ */}
          <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold uppercase tracking-widest mb-6 flex items-center gap-3">
              <span className="text-2xl">✍️</span> Создать пост
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Заголовок новости</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition"
                  placeholder="Внимание! Важный анонс..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Теги (Нажмите Enter)</label>
                <div className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-3 focus-within:border-yellow-400 transition flex flex-wrap gap-2 items-center">
                  {tags.map(tag => (
                    <span key={tag} className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded text-xs uppercase font-bold tracking-widest flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-white">✕</button>
                    </span>
                  ))}
                  <input 
                    type="text" 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="bg-transparent border-none outline-none text-white flex-grow min-w-[120px] text-sm"
                    placeholder={tags.length === 0 ? "Например: физика, турнир" : ""}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Содержание (поддерживает переносы строк)</label>
                <textarea 
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition h-48 resize-none custom-scrollbar"
                  placeholder="Текст вашей новости..."
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold uppercase tracking-widest py-4 rounded-lg transition disabled:opacity-50"
              >
                {loading ? "Публикация..." : "Опубликовать"}
              </button>
            </form>
          </div>

          {/* ПРАВАЯ КОЛОНКА: СПИСОК НОВОСТЕЙ */}
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest mb-6 flex items-center gap-3">
              <span className="text-2xl">🗂</span> Опубликованное
            </h2>
            
            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
              {fetching ? (
                <div className="text-gray-500 animate-pulse">Загрузка постов...</div>
              ) : news.length === 0 ? (
                <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-8 text-center text-gray-500 font-mono text-sm">
                  Здесь появятся ваши новости
                </div>
              ) : (
                news.map(post => {
                  const postTags = JSON.parse(post.tags || "[]");
                  return (
                    <div key={post.id} className="bg-[#1a1a1a] border border-white/10 p-5 rounded-xl relative group">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-lg pr-8">{post.title}</h3>
                        <button 
                          onClick={() => handleDelete(post.id)}
                          className="absolute top-5 right-5 text-red-500/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                          title="Удалить новость"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                        {post.content}
                      </p>
                      
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex gap-2">
                          {postTags.map((t: string) => (
                            <span key={t} className="text-gray-500 bg-white/5 px-2 py-0.5 rounded">#{t}</span>
                          ))}
                        </div>
                        <span className="text-gray-600 font-mono">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}