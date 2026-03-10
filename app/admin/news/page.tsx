"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminNewsPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
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
      const authorId = localStorage.getItem('user_id');
      const res = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          content, 
          imageUrl, 
          tags: JSON.stringify(tags),
          authorId: authorId || null 
        }),
      });

      if (res.ok) {
        alert("Новость успешно опубликована!");
        setTitle("");
        setContent("");
        setImageUrl("");
        setTags([]);
        const newPost = await res.json();
        setNews([newPost, ...news]);
      } else {
        const errData = await res.json();
        alert("Ошибка: " + (errData.details || errData.error || "Неизвестная ошибка"));
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
    const res = await fetch(`/api/admin/news?id=${id}`, { method: "DELETE" });
    if(res.ok) {
      setNews(news.filter(n => n.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12">
      {/* max-w-4xl делает колонку аккуратной по центру */}
      <div className="max-w-4xl mx-auto flex flex-col gap-12">
        
        {/* Шапка админки */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <h1 className="text-3xl font-extrabold uppercase tracking-tight">Управление <span className="text-yellow-400">Новостями</span></h1>
        </div>

        {/* ВЕРХНИЙ БЛОК: ФОРМА СОЗДАНИЯ */}
        <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 shadow-2xl">
          <h2 className="text-xl font-bold uppercase tracking-widest mb-6 flex items-center gap-3">
            <span className="text-2xl">✍️</span> Создать пост
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Обложка (URL картинки)</label>
              <input 
                type="text" 
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition"
                placeholder="https://example.com/image.jpg (необязательно)"
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
                  placeholder={tags.length === 0 ? "Например: физика" : ""}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Содержание</label>
              <textarea 
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition h-40 resize-none custom-scrollbar"
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

        {/* НИЖНИЙ БЛОК: СПИСОК НОВОСТЕЙ */}
        <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 shadow-2xl">
          <h2 className="text-xl font-bold uppercase tracking-widest mb-6 flex items-center gap-3">
            <span className="text-2xl">🗂</span> Опубликованное
          </h2>
          
          <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {fetching ? (
              <div className="text-gray-500 animate-pulse text-center py-10">Загрузка постов...</div>
            ) : news.length === 0 ? (
              <div className="border border-white/5 rounded-xl p-8 text-center text-gray-500 font-mono text-sm">
                Здесь появятся ваши новости
              </div>
            ) : (
              news.map(post => {
                const postTags = JSON.parse(post.tags || "[]");
                return (
                  <div key={post.id} className="bg-[#121212] border border-white/10 p-5 rounded-xl relative group flex gap-4 transition hover:border-white/20">
                    {/* Миниатюра картинки в админке */}
                    {post.imageUrl && (
                      <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-black border border-white/10">
                        <img src={post.imageUrl} className="w-full h-full object-cover opacity-80" alt="cover" />
                      </div>
                    )}
                    
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-lg pr-8 leading-tight">{post.title}</h3>
                        <button 
                          onClick={() => handleDelete(post.id)}
                          className="text-red-500/50 hover:text-red-500 transition ml-4 bg-white/5 p-2 rounded-lg"
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
                            <span key={t} className="text-yellow-400/80 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase font-bold tracking-widest text-[10px]">#{t}</span>
                          ))}
                        </div>
                        <span className="text-gray-600 font-mono">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}