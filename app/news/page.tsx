"use client";
import { useEffect, useState } from "react";

export default function NewsPage() {
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const handleLike = async (postId: number) => {
        // Замените YOUR_TEST_USER_ID на ID пользователя (telegramId), который есть у вас в базе (например свой ID админа)
        const TEST_USER_ID = "821245384";

        const res = await fetch(`/api/news/${postId}/like`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: TEST_USER_ID })
        });

        if (res.ok) {
            // Обновляем счетчик лайков локально (или вызываем заново fetch новостей)
            setNews(news.map(p => {
                if (p.id === postId) {
                    // Упрощенная логика: если сервер вернул { liked: true }, прибавляем 1, иначе отнимаем 1
                    // В реальном приложении лучше получать актуальное количество от сервера
                    const data = await res.json();
                    return {
                        ...p,
                        _count: { ...p._count, likes: data.liked ? p._count.likes + 1 : p._count.likes - 1 }
                    };
                }
                return p;
            }));
        }
    };

    useEffect(() => {
        fetch("/api/news")
            .then((res) => res.json())
            .then((data) => {
                setNews(data);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-8 text-center">Загрузка новостей...</div>;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-8">Новости и Анонсы</h1>

            <div className="space-y-6">
                {news.map((post) => {
                    const tags = JSON.parse(post.tags || "[]");

                    return (
                        <div key={post.id} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-semibold">{post.title}</h2>
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
                                    className="flex items-center gap-2 hover:text-red-500 transition"
                                    onClick={() => handleLike(post.id)}>
                                    <span>❤️</span> {post._count.likes}
                                </button>
                                <button className="flex items-center gap-2 hover:text-blue-500 transition">
                                    <span>💬</span> {post._count.comments} Комментариев
                                </button>
                                <span className="ml-auto text-sm">
                                    Автор: {post.author?.firstName || "Администрация"}
                                </span>
                            </div>
                        </div>
                    );
                })}
                {news.length === 0 && <p>Новостей пока нет.</p>}
            </div>
        </div>
    );
}