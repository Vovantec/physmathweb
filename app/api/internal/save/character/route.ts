import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-secret');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { userId, level, exp, hp, x, y } = await request.json();

    // Преобразуем координаты в строку "x-y"
    const arrMap = `${x}-${y}`;

    // Обновляем персонажа по Telegram ID пользователя
    // Используем updateMany, так как findFirst для update требует уникального поля, 
    // а userId в Character не уникален (теоретически может быть несколько чаров)
    // Но так как у нас фильтр active: true, это безопасно
    await prisma.character.updateMany({
      where: { 
        userId: BigInt(userId), 
        active: true 
      },
      data: {
        level: Number(level),
        exp: Number(exp),
        hp: Number(hp),
        arrMap: arrMap
      }
    });

    return NextResponse.json({ success: true });

  } catch (e) {
    console.error("Save Character Error:", e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}