"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminNewsCreate() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Превращаем строку "физика, математика, 10 класс" в массив ["физика", "математика", "10 класс"]
    const tagsArray = tagsInput.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);

    const res = await fetch("/api/admin/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, tags: tagsArray }),
    });

    if (res.ok) {
      alert("Новость успешно опубликована!");
      setTitle("");
      setContent("");
      setTagsInput("");
      router.push("/news"); // Перекидываем на страницу новостей посмотреть результат
    } else {
      alert("Ошибка при публикации");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md mt-10">
      <h1 className="text-2xl font-bold mb-6">Создать новость</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Например: Открыт новый курс по кинематике!"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Теги (через запятую)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="физика, обновление, важно"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Текст новости</label>
          <textarea
            required
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Пишите текст здесь..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition"
        >
          {loading ? "Публикация..." : "Опубликовать новость"}
        </button>
      </form>
    </div>
  );
}