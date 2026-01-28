import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// GET: Фронтенд опрашивает статус токена
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) return NextResponse.json({ error: 'No token' }, { status: 400 });

  const authCode = await prisma.authCode.findUnique({
    where: { token }
  });

  if (!authCode) return NextResponse.json({ status: 'EXPIRED' });

  if (authCode.status === 'SUCCESS' && authCode.userId) {
    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { telegramId: authCode.userId }
    });
    
    // Удаляем использованный токен
    await prisma.authCode.delete({ where: { token } });

    return NextResponse.json({ 
      status: 'SUCCESS', 
      user: {
        id: user?.id.toString(),
        telegramId: user?.telegramId.toString(),
        name: user?.firstName || user?.username,
        photo: user?.photoUrl,
        isAdmin: user?.isAdmin // <--- ВАЖНО: Возвращаем статус админа на фронтенд
      }
    });
  }

  return NextResponse.json({ status: 'PENDING' });
}

// POST: Создание нового токена для входа
export async function POST() {
  // Используем crypto.randomUUID (доступно в Node.js v14.17.0+ и глобально в v15.6.0+, либо v19+)
  // Если у вас старая версия Node, используйте uuidv4
  const token = crypto.randomUUID(); 
  
  await prisma.authCode.create({
    data: { token }
  });

  return NextResponse.json({ token });
}