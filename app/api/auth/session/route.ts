import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Данные, пришедшие от Telegram Login Widget
    const { id, first_name, username, photo_url, auth_date, hash } = body;

    if (!hash || !id || !auth_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // === 1. ПРОВЕРКА ПОДПИСИ (Security Check) ===
    
    const token = process.env.BOT_TOKEN;
    if (!token) {
      console.error('BOT_TOKEN is not defined in .env');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // A. Проверка времени (защита от Replay Attack)
    // Данные действительны, например, 24 часа (86400 секунд)
    const now = Math.floor(Date.now() / 1000);
    if (now - Number(auth_date) > 86400) {
      return NextResponse.json({ error: 'Data is outdated' }, { status: 401 });
    }

    // B. Формирование строки для проверки (data-check-string)
    // Сортируем ключи по алфавиту и собираем строку "key=value\n"
    // Важно: hash не участвует в формировании строки
    const dataCheckArr = [];
    if (auth_date) dataCheckArr.push(`auth_date=${auth_date}`);
    if (first_name) dataCheckArr.push(`first_name=${first_name}`);
    if (id) dataCheckArr.push(`id=${id}`);
    if (photo_url) dataCheckArr.push(`photo_url=${photo_url}`);
    if (username) dataCheckArr.push(`username=${username}`);
    
    // Сортировка обязательна по стандарту Telegram
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    // C. Вычисление хеша (HMAC-SHA256)
    // 1. Секретный ключ = SHA256(BOT_TOKEN)
    const secretKey = crypto.createHash('sha256').update(token).digest();
    
    // 2. Итоговый хеш = HMAC_SHA256(dataCheckString, secretKey)
    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // D. Сравнение
    if (hmac !== hash) {
      console.warn(`Signature verification failed for ID ${id}`);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // === 2. ЛОГИКА АВТОРИЗАЦИИ ===

    // Если мы здесь, значит данные точно от Telegram.
    // Создаем или обновляем пользователя.
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(id) },
      update: {
        firstName: first_name,
        username: username,
        photoUrl: photo_url,
      },
      create: {
        telegramId: BigInt(id),
        firstName: first_name,
        username: username,
        photoUrl: photo_url,
        points: 0,
      },
    });

    // Генерируем JWT для сессии
    const jwtSecret = process.env.BOT_TOKEN || 'fallback_secret';
    const sessionToken = jwt.sign(
      { userId: user.telegramId.toString() }, // BigInt в строку
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Устанавливаем куку
    const response = NextResponse.json({ success: true, user });
    
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true, // Скрипты не могут читать куку (защита от XSS)
      secure: process.env.NODE_ENV === 'production', // Только HTTPS в проде
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    });

    return response;

  } catch (error) {
    console.error('Session API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}