export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight mb-4">
        Добро пожаловать
      </h1>
      <p className="text-gray-400 font-mono text-lg mb-12 border-l-4 border-yellow-400 pl-4">
        Система управления образовательной платформой "ФизМат by Шевелев".
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Карточка 1 */}
        <div className="bg-[#1a1a1a] border border-white/10 p-8 rounded-xl shadow-xl hover:border-white/30 transition group">
          <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">📚</div>
          <h3 className="text-xl font-bold uppercase tracking-widest mb-2">Курсы</h3>
          <p className="text-sm font-mono text-gray-500 leading-relaxed mb-6">
            Добавление новых курсов, тем, уроков и настройка домашних заданий.
          </p>
          <a href="/admin/courses" className="inline-block text-xs font-bold font-mono text-yellow-400 uppercase tracking-widest border border-yellow-400/50 hover:bg-yellow-400 hover:text-black px-4 py-2 rounded transition">
            Перейти к курсам →
          </a>
        </div>

        {/* Карточка 2 (Заглушка на будущее) */}
        <div className="bg-[#1a1a1a] border border-white/5 p-8 rounded-xl shadow-xl opacity-50 grayscale">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-xl font-bold uppercase tracking-widest mb-2">Студенты</h3>
          <p className="text-sm font-mono text-gray-500 leading-relaxed mb-6">
            Статистика учеников, их баллы и прогресс по домашним заданиям.
          </p>
          <span className="inline-block text-xs font-bold font-mono text-gray-500 uppercase tracking-widest border border-white/10 px-4 py-2 rounded">
            В разработке
          </span>
        </div>
      </div>
    </div>
  );
}