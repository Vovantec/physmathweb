import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Фикс для сериализации BigInt (важно для Telegram ID)
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        points: 'desc', // Сортируем по убыванию баллов
      },
      include: {
        attempts: true, // Подтягиваем все попытки сдачи ДЗ
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Ошибка загрузки студентов:", error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}