import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = await params;
  
  // Получаем userId из query параметров (передаем его с фронта)
  const { searchParams } = new URL(request.url);
  const userIdStr = searchParams.get('userId');

  let targetTgId: bigint | undefined;

  // 1. Если передан ID пользователя (внутренний), узнаем его Telegram ID
  if (userIdStr) {
    const internalId = parseInt(userIdStr);
    if (!isNaN(internalId)) {
        const user = await prisma.user.findUnique({
            where: { id: internalId }
        });
        if (user) {
            targetTgId = user.telegramId;
        }
    }
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: parseInt(id) },
    include: { 
        questions: true,
        task: true,
        attempts: targetTgId ? {
            where: { userId: targetTgId },
            orderBy: { createdAt: 'asc' } 
        } : false
    }
  });

  if (!lesson) return NextResponse.json({ error: 'Урок не найден' }, { status: 404 });
  
  // BigInt не сериализуется в JSON автоматически, нужно преобразовать
  const safeLesson = JSON.parse(JSON.stringify(lesson, (key, value) =>
    typeof value === 'bigint'
        ? value.toString()
        : value // return everything else unchanged
  ));

  return NextResponse.json(safeLesson);
}