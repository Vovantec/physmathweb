'use client';
import { Item } from '@/lib/game/types';
import Image from 'next/image';

interface Props {
  item?: Item;
  pos: number;
  isEquipment?: boolean;
  onDrop: (fromPos: number, toPos: number) => void;
}

export default function InventorySlot({ item, pos, isEquipment, onDrop }: Props) {
  
  const handleDragStart = (e: React.DragEvent) => {
    if (!item) {
      e.preventDefault();
      return;
    }
    // Передаем позицию начала перетаскивания
    e.dataTransfer.setData("text/plain", pos.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Разрешаем сброс
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromPos = parseInt(e.dataTransfer.getData("text/plain"));
    if (!isNaN(fromPos) && fromPos !== pos) {
      onDrop(fromPos, pos);
    }
  };

  // Стили для экипировки и обычной сумки
  const baseStyle = "relative w-10 h-10 border border-[#4c453f] bg-black/60 flex items-center justify-center select-none transition-colors";
  const hoverStyle = "hover:border-[#eac98a] hover:bg-black/80";

  return (
    <div 
      className={`${baseStyle} ${hoverStyle} ${isEquipment ? 'rounded-md shadow-inner' : 'rounded-sm'}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      title={isEquipment ? `Слот ${pos}` : undefined}
    >
      {/* Плейсхолдер для пустых слотов экипировки (можно добавить иконки силуэтов) */}
      {!item && isEquipment && (
         <span className="text-xs text-gray-600 opacity-50">{pos}</span>
      )}

      {item && (
        <div 
          draggable 
          onDragStart={handleDragStart}
          className="w-full h-full cursor-grab active:cursor-grabbing p-0.5"
        >
          {/* ВАЖНО: Путь к картинкам. Сервер возвращает ID картинки или путь. 
             Нужно адаптировать под вашу структуру. */}
          {/* Если img приходит как число '5', то путь '/images/items/5.png' */}
          <img 
            src={`/images/items/${item.img || 'default.png'}`} 
            alt={item.name} 
            className="w-full h-full object-contain drop-shadow-md"
            draggable={false} // Чтобы не тянулась сама картинка браузером
          />
          
          {item.count && item.count > 1 && (
            <span className="absolute bottom-0 right-0 text-[10px] text-white font-bold bg-black/70 px-1 rounded-tl">
              {item.count}
            </span>
          )}
        </div>
      )}
    </div>
  );
}