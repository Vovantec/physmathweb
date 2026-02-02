'use client';
import { DialogData } from '@/lib/game/types';
import { useEffect, useState } from 'react';

interface Props {
  data: DialogData | null;
  onOptionSelect: (optionId: number) => void;
  onClose: () => void;
}

export default function DialogModal({ data, onOptionSelect, onClose }: Props) {
  if (!data) return null;

  return (
    <div className="absolute top-[10%] left-1/2 transform -translate-x-1/2 w-[500px] bg-slate-900/95 border-2 border-[#4c453f] rounded-lg shadow-2xl flex flex-col z-50 pointer-events-auto overflow-hidden animate-in fade-in zoom-in duration-200">
      
      {/* Шапка с именем NPC */}
      <div className="flex justify-between items-center p-3 border-b border-[#4c453f] bg-black/50">
        <h2 className="text-[#eac98a] font-bold text-xl tracking-wide flex items-center gap-2">
          {/* Иконка NPC (заглушка) */}
          <div className="w-8 h-8 rounded-full bg-slate-700 border border-gray-500 overflow-hidden">
             {/* <img src={`/container/avatars/${data.npcName}.png`} /> */}
          </div>
          {data.npcName}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white font-bold px-2 text-2xl leading-none">&times;</button>
      </div>

      {/* Текст диалога */}
      <div className="p-6 text-gray-200 text-lg leading-relaxed border-b border-[#4c453f] min-h-[150px] max-h-[300px] overflow-y-auto bg-black/20">
        {data.text}
      </div>

      {/* Варианты ответов */}
      <div className="flex flex-col bg-black/40">
        {data.options.length > 0 ? (
          data.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onOptionSelect(opt.id)}
              className="p-3 text-left text-[#eac98a] hover:bg-[#eac98a]/10 hover:text-white border-b border-[#4c453f] last:border-0 transition-colors flex items-center gap-2 group"
            >
              <span className="text-gray-500 group-hover:text-[#eac98a]">-</span>
              {opt.text}
            </button>
          ))
        ) : (
          <button
            onClick={onClose}
            className="p-3 text-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            [Завершить разговор]
          </button>
        )}
      </div>

    </div>
  );
}