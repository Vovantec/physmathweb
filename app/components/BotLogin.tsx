"use client";
import { useEffect, useState } from 'react';

// Имя вашего бота (чтобы сформировать ссылку)
const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "PhysicsMath_Bot";

export default function BotLogin({ onAuth }: { onAuth: (user: any) => void }) {
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  // 1. При загрузке генерируем токен
  useEffect(() => {
    fetch('/api/auth/login', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setToken(data.token);
        // Формируем ссылку для кнопки (start parameter)
        setLink(`https://t.me/${BOT_USERNAME}?start=auth_${data.token}`);
      });
  }, []);

  // 2. Опрашиваем сервер (Polling), авторизовался ли юзер
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      fetch(`/api/auth/login?token=${token}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'SUCCESS') {
            clearInterval(interval);
            onAuth(data.user); // Вход успешен!
          }
        });
    }, 2000); // Проверяем каждые 2 секунды

    return () => clearInterval(interval);
  }, [token, onAuth]);

  if (!link) return <div className="text-sm text-gray-500">Загрузка...</div>;

  return (
    <div className="flex flex-col items-center gap-2">
        <a 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-full transition flex items-center gap-2 shadow-md"
        >
           <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
           Войти через Telegram
        </a>
        <p className="text-xs text-gray-400">Нажмите и запустите бота</p>
    </div>
  );
}