'use client';
import { useState, useEffect, useRef } from 'react';
import { Room } from 'colyseus.js';
import { Item } from '@/lib/game/types';
import InventoryModal from './InventoryModal';

// Стили для рамок (из gui.css адаптированные под Tailwind)
const panelStyle = "bg-slate-900/90 border-2 border-[#4c453f] rounded-md shadow-lg";
const textGold = "text-[#eac98a]";

export default function GameUI({ room }: { room: Room }) {
  const [messages, setMessages] = useState<{name: string, text: string}[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Состояние персонажа (заглушка)
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [mp, setMp] = useState(100);
  const [showInventory, setShowInventory] = useState(false);
  const [inventory, setInventory] = useState<Item[]>([]);

  useEffect(() => {
    // Слушаем обновление инвентаря от сервера
    room.onMessage("inventory:update", (data: Item[]) => {
       console.log("Inv updated:", data);
       setInventory(data);
    });

    // Слушаем чат
    room.onMessage("chat", (message) => {
       setMessages(prev => [...prev, message]);
    });

    // Слушаем изменения своих статов (если сервер их шлет)
    // room.onMessage("stats", (stats) => { ... });
  }, [room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    room.send("chat", inputValue);
    setInputValue("");
  };

  // Метод перетаскивания
  const handleSwap = (fromPos: number, toPos: number) => {
    // Оптимистичное обновление UI (чтобы не ждало пинга)
    // В идеале можно обновить локальный стейт, но пока просто шлем запрос
    room.send("inventory:swap", { oldPos: fromPos, newPos: toPos });
  };

  // Обработчик клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyI') setShowInventory(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 pointer-events-none select-none">
      
      {/* === ВЕРХНЯЯ ПАНЕЛЬ (Unit Frame) === */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className={`w-64 p-2 flex gap-3 ${panelStyle}`}>
           {/* Аватар */}
           <div className="w-16 h-16 bg-black border border-gray-600 rounded-full overflow-hidden">
              <img src="/images/avatar_placeholder.png" alt="Avatar" className="w-full h-full object-cover"/>
           </div>
           
           {/* Статы */}
           <div className="flex-1 flex flex-col justify-center">
               <div className={`font-bold text-sm mb-1 ${textGold}`}>Игрок</div>
               
               {/* HP Bar */}
               <div className="relative w-full h-3 bg-gray-800 rounded-sm mb-1 overflow-hidden">
                   <div 
                     className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300" 
                     style={{ width: `${(hp/maxHp)*100}%` }}
                   />
                   <span className="absolute w-full text-[10px] text-white text-center leading-3 shadow-black drop-shadow-md">
                     {hp} / {maxHp}
                   </span>
               </div>

               {/* MP Bar */}
               <div className="relative w-full h-3 bg-gray-800 rounded-sm overflow-hidden">
                   <div 
                     className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300"
                     style={{ width: `${mp/100}%` }}
                   />
               </div>
           </div>
        </div>

        {/* Меню справа */}
        <div className="flex gap-2">
            <button className={`p-2 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded border border-[#4c453f] transition-colors`}>
                ⚙️
            </button>
        </div>
      </div>

      {/* === ЦЕНТР (Уведомления / Окна) === */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          {/* Здесь будут окна диалогов, инвентаря и т.д. */}
      </div>

      {/* === НИЖНЯЯ ПАНЕЛЬ === */}
      <div className="flex items-end gap-4 pointer-events-auto">
          
          {/* Чат */}
          <div className={`w-80 h-64 flex flex-col ${panelStyle}`}>
             <div className="flex-1 overflow-y-auto p-2 text-sm text-shadow text-white scrollbar-thin scrollbar-thumb-gray-600">
                {messages.map((msg, i) => (
                    <div key={i} className="mb-1">
                        <span className="font-bold text-blue-400 cursor-pointer hover:underline">[{msg.name}]:</span> 
                        <span className="ml-1 text-gray-200">{msg.text}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
             </div>
             <form onSubmit={sendMessage} className="p-1 bg-black/40 border-t border-[#4c453f]">
                 <input 
                    type="text" 
                    className="w-full bg-transparent text-white px-2 py-1 text-sm focus:outline-none"
                    placeholder="Введите сообщение..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                 />
             </form>
          </div>

          {/* Панель способностей (Action Bar) */}
          <div className="flex-1 flex justify-center pb-2">
              <div className="flex gap-1 bg-black/60 p-1 rounded border border-[#4c453f]">
                  {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-12 h-12 bg-gray-900 border border-gray-700 hover:border-white cursor-pointer relative group">
                          <span className="absolute top-0 left-1 text-[10px] text-gray-400">{i}</span>
                          {/* Сюда иконку скилла */}
                      </div>
                  ))}
              </div>
          </div>

          {/* Меню кнопок */}
          <div className="flex gap-1 mb-2">
             <button className="w-10 h-10 bg-slate-800 rounded border border-[#4c453f] text-white hover:bg-slate-700" title="Инвентарь (I)">🎒</button>
             <button className="w-10 h-10 bg-slate-800 rounded border border-[#4c453f] text-white hover:bg-slate-700" title="Персонаж (C)">👤</button>
             <button className="w-10 h-10 bg-slate-800 rounded border border-[#4c453f] text-white hover:bg-slate-700" title="Задания (Q)">📜</button>
          </div>

      </div>

      {/* Кнопка открытия (в нижнем меню) */}
       <div className="flex gap-1 mb-2 pointer-events-auto">
          <button 
             onClick={() => setShowInventory(!showInventory)}
             className="w-10 h-10 bg-slate-800 ..."
          >🎒</button>
          {/* ... */}
       </div>

       {/* МОДАЛЬНЫЕ ОКНА */}
       <InventoryModal 
          isOpen={showInventory} 
          inventory={inventory} 
          onClose={() => setShowInventory(false)}
          onSwap={handleSwap}
       />
    </div>
  );
}