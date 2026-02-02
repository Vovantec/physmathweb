'use client';
import { Item, EQUIPMENT_SLOTS } from '@/lib/game/types';
import InventorySlot from './InventorySlot';

interface Props {
  inventory: Item[];
  isOpen: boolean;
  onClose: () => void;
  onSwap: (from: number, to: number) => void;
}

export default function InventoryModal({ inventory, isOpen, onClose, onSwap }: Props) {
  if (!isOpen) return null;

  // Хелпер для получения предмета по слоту
  const getItem = (pos: number) => inventory.find(i => i.pos === pos);

  // Генерируем слоты сумки (например, с 15 по 63)
  const bagSlots = Array.from({ length: 49 }, (_, i) => i + 15);

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-slate-900/95 border-2 border-[#4c453f] rounded-lg shadow-2xl flex flex-col z-50 pointer-events-auto">
      
      {/* Заголовок */}
      <div className="flex justify-between items-center p-2 border-b border-[#4c453f] bg-black/40">
        <h2 className="text-[#eac98a] font-bold text-lg">Инвентарь</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white font-bold px-2">✕</button>
      </div>

      <div className="flex flex-1 p-4 gap-4 overflow-hidden">
        
        {/* Левая часть: Кукла персонажа (Экипировка) */}
        <div className="w-1/3 flex flex-col items-center bg-black/30 rounded border border-[#4c453f] p-2 relative">
           {/* Фоновый силуэт */}
           <div className="absolute inset-0 opacity-20 bg-[url('/images/gui/silhouette.png')] bg-center bg-no-repeat bg-contain pointer-events-none" />

           {/* Сетка экипировки (Верстка похожа на Diablo/WoW) */}
           <div className="relative w-full h-full flex flex-col justify-between py-4 z-10">
              {/* Голова, Плечи */}
              <div className="flex justify-between px-2">
                 <InventorySlot pos={0} item={getItem(0)} isEquipment onDrop={onSwap} /> {/* Head */}
                 <InventorySlot pos={9} item={getItem(9)} isEquipment onDrop={onSwap} /> {/* Shoulders */}
              </div>
              
              {/* Плащ, Шея */}
              <div className="flex justify-between px-6 mt-[-10px]">
                 <InventorySlot pos={10} item={getItem(10)} isEquipment onDrop={onSwap} />
                 <InventorySlot pos={13} item={getItem(13)} isEquipment onDrop={onSwap} />
              </div>

              {/* Тело, Руки */}
              <div className="flex justify-between px-2">
                 <InventorySlot pos={1} item={getItem(1)} isEquipment onDrop={onSwap} />
                 <InventorySlot pos={3} item={getItem(3)} isEquipment onDrop={onSwap} />
              </div>

              {/* Оружие */}
              <div className="flex justify-between px-1">
                 <InventorySlot pos={6} item={getItem(6)} isEquipment onDrop={onSwap} /> {/* Main Hand */}
                 <InventorySlot pos={14} item={getItem(14)} isEquipment onDrop={onSwap} /> {/* Off Hand */}
              </div>

              {/* Пояс, Ноги */}
              <div className="flex justify-between px-4">
                 <InventorySlot pos={4} item={getItem(4)} isEquipment onDrop={onSwap} />
                 <InventorySlot pos={2} item={getItem(2)} isEquipment onDrop={onSwap} />
              </div>

              {/* Ступни, Кольцо */}
              <div className="flex justify-between px-6">
                 <InventorySlot pos={5} item={getItem(5)} isEquipment onDrop={onSwap} />
                 <InventorySlot pos={11} item={getItem(11)} isEquipment onDrop={onSwap} />
              </div>
           </div>
        </div>

        {/* Правая часть: Сумка */}
        <div className="flex-1 bg-black/30 rounded border border-[#4c453f] p-2 overflow-y-auto custom-scrollbar">
           <div className="grid grid-cols-7 gap-1">
              {bagSlots.map(pos => (
                <InventorySlot 
                  key={pos} 
                  pos={pos} 
                  item={getItem(pos)} 
                  onDrop={onSwap} 
                />
              ))}
           </div>
        </div>

      </div>

      {/* Футер с золотом */}
      <div className="p-2 border-t border-[#4c453f] flex justify-end items-center gap-2 bg-black/40">
         <span className="text-yellow-500 font-bold">1250 💰</span>
      </div>

    </div>
  );
}