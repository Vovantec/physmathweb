import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

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

    if (!user) return NextResponse.json({ status: 'ERROR', message: 'User not found' });

    // === ГЕНЕРАЦИЯ КУКИ (НОВОЕ) ===
    const jwtSecret = process.env.BOT_TOKEN || 'secret';
    const sessionToken = jwt.sign(
      { userId: user.telegramId.toString() }, 
      jwtSecret, 
      { expiresIn: '7d' }
    );

    // Формируем ответ
    const response = NextResponse.json({ 
      status: 'SUCCESS', 
      user: {
        id: user.id.toString(),
        telegramId: user.telegramId.toString(),
        name: user.firstName || user.username,
        photo: user.photoUrl,
        isAdmin: user.isAdmin
      }
    });

    // Устанавливаем куку
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    });

    return response;
  }

  return NextResponse.json({ status: 'PENDING' });
}

// POST: Создание нового токена для входа
export async function POST() {
  const token = crypto.randomUUID(); 
  
  await prisma.authCode.create({
    data: { token }
  });

  return NextResponse.json({ token });
}