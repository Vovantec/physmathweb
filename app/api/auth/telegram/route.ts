import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, first_name, username, photo_url, auth_date, hash } = body;

    // 1. ПРОВЕРКА ХЕША (Безопасность)
    const token = process.env.BOT_TOKEN;
    if (!token) throw new Error('BOT_TOKEN не найден в .env');

    const dataCheckArr = [];
    if (auth_date) dataCheckArr.push(`auth_date=${auth_date}`);
    if (first_name) dataCheckArr.push(`first_name=${first_name}`);
    if (id) dataCheckArr.push(`id=${id}`);
    if (photo_url) dataCheckArr.push(`photo_url=${photo_url}`);
    if (username) dataCheckArr.push(`username=${username}`);
    
    const dataCheckString = dataCheckArr.sort().join('\n');
    
    const secretKey = crypto.createHash('sha256').update(token).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (hmac !== hash) {
      return NextResponse.json({ error: 'Неверные данные (подпись не совпала)' }, { status: 401 });
    }

    // 2. ПРОВЕРКА ВРЕМЕНИ
    const now = Math.floor(Date.now() / 1000);
    if (now - auth_date > 86400) {
       return NextResponse.json({ error: 'Данные устарели' }, { status: 401 });
    }

    // 3. ОПРЕДЕЛЕНИЕ ПРАВ АДМИНА (Как в боте)
    // Берем список ID из .env, разделяем по запятой и проверяем текущий ID
    const adminsStr = process.env.ADMINS || "";
    const adminIds = adminsStr.split(",").map(s => s.trim());
    const isAdmin = adminIds.includes(id.toString());

    // 4. СОХРАНЕНИЕ / ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ
    const telegramIdBigInt = BigInt(id);
    
    const user = await prisma.user.upsert({
      where: { telegramId: telegramIdBigInt },
      update: {
        username: username || null,
        firstName: first_name || null,
        photoUrl: photo_url || null,
        isAdmin: isAdmin,
      },
      create: {
        telegramId: telegramIdBigInt,
        username: username || null,
        firstName: first_name || null,
        photoUrl: photo_url || null,
        points: 0,
        isAdmin: isAdmin,
      }
    });

    return NextResponse.json({ 
      id: user.id.toString(),
      name: user.firstName,
      photo: user.photoUrl,
      isAdmin: user.isAdmin
    });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}