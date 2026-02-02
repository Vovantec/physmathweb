'use client';
import { useState, useEffect, useRef } from 'react';
import { Room } from 'colyseus.js';
import { Item, DialogData } from '@/lib/game/types';
import InventoryModal from './InventoryModal';
import DialogModal from './DialogModal';

// Стили для рамок
const panelStyle = "bg-slate-900/90 border-2 border-[#4c453f] rounded-md shadow-lg";
const textGold = "text-[#eac98a]";

export default function GameUI({ room }: { room: Room }) {
  const [messages, setMessages] = useState<{name: string, text: string}[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Статы персонажа (приходят с сервера или моки)
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [mp, setMp] = useState(100);

  // === Состояние Инвентаря ===
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [dialogData, setDialogData] = useState<DialogData | null>(null);

  useEffect(() => {
    // 1. Слушаем чат
    room.onMessage("chat", (message) => {
       setMessages(prev => [...prev, message]);
    });

    // 2. Слушаем обновление инвентаря
    // Сервер отправляет сообщение "inventory:update" при входе или изменении
    room.onMessage("inventory:update", (data: Item[]) => {
       console.log("Получен инвентарь:", data);
       setInventory(data);
    });

    // 3. Слушаем ошибки / уведомления
    room.onMessage("notif", (data: {message: string, type: string}) => {
        // Можно добавить красивый тостер (react-toastify), пока в чат или консоль
        console.log(`[${data.type}] ${data.message}`);
        setMessages(prev => [...prev, { name: "System", text: data.message }]);
    });

    // 4. Слушаем входящий диалог
    room.onMessage("dialog", (data: any) => {
       // Сервер присылает: { id, title, text, name, children: [{id, text}] }
       // Преобразуем в наш формат
       setDialogData({
           id: data.id,
           npcName: data.name || "NPC",
           text: data.text,
           options: data.children || []
       });
    });
    
    // Очистка диалога при ошибке или закрытии сервером
    room.onMessage("dialog:close", () => {
        setDialogData(null);
    });

  }, [room]);

  // Автоскролл чата
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Обработка горячих клавиш (I - инвентарь)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Игнорируем, если фокус в поле ввода
        if ((e.target as HTMLElement).tagName === 'INPUT') return;

        if (e.code === 'KeyI') {
            setIsInventoryOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    room.send("chat", inputValue);
    setInputValue("");
  };

  // Метод выбора ответа
  const handleDialogOption = (optionId: number) => {
      // Отправляем на сервер выбор
      room.send("dialog:continue", { 
          dialogId: optionId, // ID следующего узла диалога
          npcName: dialogData?.npcName 
      });
      // Можно временно скрыть диалог или ждать обновления
  };

  // Метод перемещения предмета
  const handleInventorySwap = (fromPos: number, toPos: number) => {
      // Оптимистичное обновление (визуально меняем сразу, не дожидаясь сервера)
      // Но пока для надежности просто шлем запрос, сервер вернет inventory:update
      room.send("inventory:swap", { oldPos: fromPos, newPos: toPos });
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 pointer-events-none select-none relative">
      
      {/* === ВЕРХНЯЯ ПАНЕЛЬ (Unit Frame) === */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className={`w-64 p-2 flex gap-3 ${panelStyle}`}>
           <div className="w-16 h-16 bg-black border border-gray-600 rounded-full overflow-hidden">
              <img src="/images/avatar_placeholder.png" alt="Avatar" className="w-full h-full object-cover"/>
           </div>
           
           <div className="flex-1 flex flex-col justify-center">
               <div className={`font-bold text-sm mb-1 ${textGold}`}>Игрок</div>
               
               <div className="relative w-full h-3 bg-gray-800 rounded-sm mb-1 overflow-hidden">
                   <div 
                     className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300" 
                     style={{ width: `${(hp/maxHp)*100}%` }}
                   />
                   <span className="absolute w-full text-[10px] text-white text-center leading-3 shadow-black drop-shadow-md">
                     {hp} / {maxHp}
                   </span>
               </div>

               <div className="relative w-full h-3 bg-gray-800 rounded-sm overflow-hidden">
                   <div 
                     className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300"
                     style={{ width: `${mp/100}%` }}
                   />
               </div>
           </div>
        </div>

        <div className="flex gap-2">
            <button className={`p-2 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded border border-[#4c453f] transition-colors text-white`}>
                ⚙️
            </button>
        </div>
      </div>

      {/* ЦЕНТР (МОДАЛЬНЫЕ ОКНА) */}
       <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
          
          {/* Инвентарь */}
          <InventoryModal 
             isOpen={isInventoryOpen}
             inventory={inventory}
             onClose={() => setIsInventoryOpen(false)}
             onSwap={handleInventorySwap}
          />

          {/* Диалог (Новое!) */}
          <DialogModal 
             data={dialogData}
             onOptionSelect={handleDialogOption}
             onClose={() => setDialogData(null)}
          />

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
                      <div key={i} className="w-12 h-12 bg-gray-900 border border-gray-700 hover:border-white cursor-pointer relative group flex items-center justify-center">
                          <span className="absolute top-0 left-1 text-[10px] text-gray-400">{i}</span>
                          {/* Заглушка иконки способности */}
                          {/* <img src={`/container/skills/${i}.png`} /> */}
                      </div>
                  ))}
              </div>
          </div>

          {/* Меню кнопок */}
          <div className="flex gap-1 mb-2">
             <button 
                onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                className="w-10 h-10 bg-slate-800 rounded border border-[#4c453f] text-white hover:bg-slate-700 flex items-center justify-center active:translate-y-0.5 transition-transform" 
                title="Инвентарь (I)"
             >
                🎒
             </button>
             <button className="w-10 h-10 bg-slate-800 rounded border border-[#4c453f] text-white hover:bg-slate-700 flex items-center justify-center active:translate-y-0.5 transition-transform" title="Персонаж (C)">👤</button>
             <button className="w-10 h-10 bg-slate-800 rounded border border-[#4c453f] text-white hover:bg-slate-700 flex items-center justify-center active:translate-y-0.5 transition-transform" title="Задания (Q)">📜</button>
          </div>

      </div>
    </div>
  );
}