'use client';

import { useState, useEffect, useRef } from 'react';
import { Room } from 'colyseus.js';
import InventoryModal from './InventoryModal'; // Убедитесь, что этот компонент существует
import DialogModal from './DialogModal';       // Убедитесь, что этот компонент существует

interface GameUIProps {
  room: Room;
  gameState: any; // Типизируйте согласно вашей схеме Colyseus
}

interface ChatMessage {
  name: string;
  text: string;
}

export default function GameUI({ room, gameState }: GameUIProps) {
  // --- Состояния интерфейса ---
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [mp, setMp] = useState(100);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  
  const [dialogData, setDialogData] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Стили ---
  const panelStyle = "bg-slate-900/80 border border-[#4c453f] rounded-lg shadow-lg backdrop-blur-sm";
  const textGold = "text-[#ffd700] drop-shadow-md text-shadow";

  // --- Подписки на события комнаты ---
  useEffect(() => {
    if (!room) return;

    // Слушаем изменения игрока (HP, MP)
    // Важно: это зависит от того, как вы реализовали стейт на сервере.
    // Пример для Colyseus Schema:
    /*
    room.state.players.onAdd = (player, key) => {
        if (key === room.sessionId) {
            player.onChange = () => {
                setHp(player.hp);
                setMaxHp(player.maxHp);
            }
        }
    }
    */

    // Слушаем чат
    room.onMessage("chat", (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    // Слушаем обновление инвентаря
    room.onMessage("inventoryUpdate", (data: any[]) => {
        setInventory(data);
    });

    return () => {
      room.removeAllListeners("chat");
      room.removeAllListeners("inventoryUpdate");
    };
  }, [room]);

  // Автоскролл чата
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Хендлеры ---
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    room.send("chat", { text: inputValue });
    setInputValue("");
  };

  const handleInventorySwap = (fromIndex: number, toIndex: number) => {
      room.send("swapItem", { from: fromIndex, to: toIndex });
  };

  const handleDialogOption = (optionId: string) => {
      console.log("Selected option:", optionId);
      // room.send("dialogOption", { id: optionId });
      setDialogData(null); 
  };

  return (
    // ГЛАВНЫЙ КОНТЕЙНЕР: Нулевой размер, чтобы не перекрывать ничего.
    // Элементы внутри будут позиционироваться абсолютно.
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      
      {/* === ЛЕВЫЙ ВЕРХНИЙ УГОЛ (Unit Frame) === */}
      <div className={`absolute top-4 left-4 w-64 p-2 flex gap-3 ${panelStyle}`}>
           <div className="w-16 h-16 bg-black border border-gray-600 rounded-full overflow-hidden">
              <img src="/images/avatar_placeholder.png" alt="Avatar" className="w-full h-full object-cover"/>
           </div>
           <div className="flex-1 flex flex-col justify-center">
               <div className={`font-bold text-sm mb-1 ${textGold}`}>Игрок</div>
               {/* HP */}
               <div className="relative w-full h-3 bg-gray-800 rounded-sm mb-1 overflow-hidden">
                   <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-red-500" style={{ width: `${(hp/maxHp)*100}%` }} />
                   <span className="absolute w-full text-[10px] text-white text-center leading-3 drop-shadow-md">{hp} / {maxHp}</span>
               </div>
               {/* MP */}
               <div className="relative w-full h-3 bg-gray-800 rounded-sm overflow-hidden">
                   <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-500" style={{ width: `${mp/100}%` }} />
               </div>
           </div>
      </div>

      {/* === ПРАВЫЙ ВЕРХНИЙ УГОЛ (Настройки) === */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <button className="p-2 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded border border-[#4c453f] text-white">
            ⚙️
        </button>
      </div>

      {/* === ЦЕНТР (МОДАЛКИ) === */}
      {/* Этот контейнер нужен для центрирования, но он прозрачен для кликов */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
         {isInventoryOpen && (
             <div className="pointer-events-auto"> 
                 <InventoryModal 
                     isOpen={isInventoryOpen}
                     inventory={inventory}
                     onClose={() => setIsInventoryOpen(false)}
                     onSwap={(f, t) => room.send("swapItem", { from: f, to: t })}
                 />
             </div>
         )}
         {dialogData && (
             <div className="pointer-events-auto">
                 <DialogModal 
                     data={dialogData}
                     onOptionSelect={() => setDialogData(null)}
                     onClose={() => setDialogData(null)}
                 />
             </div>
         )}
      </div>

      {/* === ЛЕВЫЙ НИЖНИЙ УГОЛ (Чат) === */}
      <div className={`absolute bottom-4 left-4 w-80 h-64 flex flex-col ${panelStyle}`}>
         <div className="flex-1 overflow-y-auto p-2 text-sm text-shadow text-white scrollbar-thin scrollbar-thumb-gray-600">
            {messages.map((msg, i) => (
                <div key={i} className="mb-1">
                    <span className="font-bold text-blue-400">[{msg.name}]:</span> 
                    <span className="ml-1 text-gray-200">{msg.text}</span>
                </div>
            ))}
            <div ref={messagesEndRef} />
         </div>
         <form onSubmit={sendMessage} className="p-1 bg-black/40 border-t border-[#4c453f]">
             <input 
                type="text" 
                className="w-full bg-transparent text-white px-2 py-1 text-sm focus:outline-none pointer-events-auto"
                placeholder="Чат..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()} 
             />
         </form>
      </div>

      {/* === НИЗ ЦЕНТР (Скиллы) === */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className="flex gap-1 bg-black/60 p-1 rounded border border-[#4c453f]">
              {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-12 h-12 bg-gray-900 border border-gray-700 hover:border-white cursor-pointer relative flex items-center justify-center">
                      <span className="absolute top-0 left-1 text-[10px] text-gray-400">{i}</span>
                  </div>
              ))}
          </div>
      </div>

      {/* === ПРАВЫЙ НИЖНИЙ УГОЛ (Меню) === */}
      <div className="absolute bottom-4 right-4 flex gap-1 pointer-events-auto">
         <button onClick={() => setIsInventoryOpen(!isInventoryOpen)} className="w-10 h-10 bg-slate-800 rounded border border-[#4c453f] text-white hover:bg-slate-700 flex items-center justify-center">🎒</button>
         <button className="w-10 h-10 bg-slate-800 rounded border border-[#4c453f] text-white hover:bg-slate-700 flex items-center justify-center">👤</button>
         <button className="w-10 h-10 bg-slate-800 rounded border border-[#4c453f] text-white hover:bg-slate-700 flex items-center justify-center">📜</button>
      </div>

    </div>
  );
}