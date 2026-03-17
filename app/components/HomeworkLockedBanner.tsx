// app/components/HomeworkLockedBanner.tsx
'use client'

export default function HomeworkLockedBanner() {
  return (
    <div className="mb-8 bg-[#1a1a1a] border-2 border-white/10 rounded-xl p-8 relative overflow-hidden">
      {/* Decorative overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '20px 20px' }}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
        <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl">
          🔒
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">
            Домашнее задание ещё не открыто
          </h3>
          <p className="text-gray-400 font-mono text-sm leading-relaxed max-w-xl">
            Преподаватель откроет задание после разбора темы на занятии.
            Как только урок будет пройден — вы сразу получите доступ к ДЗ.
          </p>
        </div>
      </div>
    </div>
  )
}