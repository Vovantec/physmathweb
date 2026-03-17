// app/admin/prizes/page.tsx
// Путь: app/admin/prizes/page.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import FileManagerModal from '@/app/components/admin/FileManagerModal'

export default function AdminPrizesPage() {
  const [prizes, setPrizes]           = useState<any[]>([])
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl]       = useState('')
  const [saving, setSaving]           = useState(false)
  const [editId, setEditId]           = useState<number | null>(null)
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false)

  useEffect(() => { loadPrizes() }, [])

  const loadPrizes = () =>
    fetch('/api/admin/prizes').then(r => r.json()).then(setPrizes)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    if (editId) {
      await fetch('/api/admin/prizes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, title, description, imageUrl }),
      })
    } else {
      await fetch('/api/admin/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, imageUrl }),
      })
    }
    setSaving(false)
    resetForm()
    loadPrizes()
  }

  const handleEdit = (prize: any) => {
    setEditId(prize.id)
    setTitle(prize.title)
    setDescription(prize.description ?? '')
    setImageUrl(prize.imageUrl ?? '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить приз? Убедитесь, что он не используется в розыгрышах.')) return
    await fetch(`/api/admin/prizes?id=${id}`, { method: 'DELETE' })
    loadPrizes()
  }

  const resetForm = () => {
    setEditId(null); setTitle(''); setDescription(''); setImageUrl('')
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">Каталог призов</h1>
        <div className="h-px bg-white/20 flex-grow" />
        <Link
          href="/admin/prizes/pools"
          className="bg-yellow-400 text-black font-bold uppercase tracking-widest text-xs px-5 py-2.5 rounded-lg hover:bg-yellow-300 transition"
        >
          Розыгрыши →
        </Link>
      </div>

      {/* Form */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 mb-8 relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400 rounded-l-xl" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">
          {editId ? 'Редактировать приз' : 'Добавить приз'}
        </h2>
        <div className="flex flex-col gap-3">
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Название приза (например: Книга «Физика» + мерч)"
            className="bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none transition"
          />
          <textarea
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Описание (необязательно)"
            rows={2}
            className="bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none transition resize-none"
          />
          {/* Image URL + file manager */}
          <div className="flex gap-2">
            <input
              value={imageUrl} onChange={e => setImageUrl(e.target.value)}
              placeholder="URL картинки приза"
              className="flex-grow bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none transition"
            />
            <button
              type="button"
              onClick={() => setIsFileManagerOpen(true)}
              className="bg-white/10 px-4 rounded-lg border border-white/20 hover:bg-yellow-400 hover:text-black transition"
              title="Выбрать из файлового менеджера"
            >
              📁
            </button>
          </div>

          {/* Preview */}
          {imageUrl && (
            <div className="relative w-max">
              <span className="text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded-t font-bold font-mono absolute -top-5 left-0">
                Предпросмотр
              </span>
              <img
                src={imageUrl} alt="preview"
                className="max-h-32 rounded-b-lg rounded-tr-lg border-2 border-yellow-400/40 object-contain bg-black/60"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave} disabled={!title.trim() || saving}
              className="bg-white text-black font-extrabold uppercase tracking-widest text-xs px-6 py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-40"
            >
              {saving ? '...' : editId ? 'Сохранить' : '+ Добавить'}
            </button>
            {editId && (
              <button onClick={resetForm}
                className="border border-white/20 text-gray-400 hover:text-white font-bold uppercase tracking-widest text-xs px-5 py-3 rounded-lg transition">
                Отмена
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Prizes grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {prizes.length === 0 && (
          <div className="col-span-full text-center py-12 border border-dashed border-white/10 rounded-xl text-gray-500 font-mono">
            Призов пока нет
          </div>
        )}
        {prizes.map((prize: any) => (
          <div key={prize.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden group hover:border-white/30 transition">
            {prize.imageUrl && (
              <div className="h-44 bg-black/60 flex items-center justify-center overflow-hidden">
                <img src={prize.imageUrl} alt={prize.title} className="w-full h-full object-contain p-3" />
              </div>
            )}
            <div className="p-5">
              <h3 className="font-bold text-white mb-1">{prize.title}</h3>
              {prize.description && (
                <p className="text-xs text-gray-500 font-mono mb-3">{prize.description}</p>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleEdit(prize)}
                  className="text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition flex-grow">
                  Изменить
                </button>
                <button onClick={() => handleDelete(prize.id)}
                  className="text-xs font-bold uppercase tracking-widest bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition">
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <FileManagerModal
        isOpen={isFileManagerOpen}
        onClose={() => setIsFileManagerOpen(false)}
        onSelect={path => { setImageUrl(path); setIsFileManagerOpen(false) }}
        baseFolder="images"
      />
    </div>
  )
}