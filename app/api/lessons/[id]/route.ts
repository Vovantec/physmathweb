import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Получаем userId из query параметров
  const { searchParams } = new URL(request.url);
  const userIdStr = searchParams.get('userId');

  let targetTgId: bigint | undefined;

  // 1. Фронтенд теперь присылает напрямую Telegram ID. Просто конвертируем его в BigInt.
  if (userIdStr && userIdStr !== 'null' && userIdStr !== 'undefined') {
    try {
        targetTgId = BigInt(userIdStr);
    } catch (e) {
        console.error("Неверный формат userId:", userIdStr);
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
  
  // 2. ИСКОРЕНЯЕМ ОШИБКУ: Гарантируем, что attempts всегда массив, даже если Prisma вернула undefined
  const lessonWithAttempts = {
      ...lesson,
      attempts: lesson.attempts || []
  };

  // 3. Сериализуем BigInt в строку для безопасной передачи в JSON
  const safeLesson = JSON.parse(JSON.stringify(lessonWithAttempts, (key, value) =>
    typeof value === 'bigint'
        ? value.toString()
        : value 
  ));

  return NextResponse.json(safeLesson);
}