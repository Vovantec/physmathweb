import { prisma } from '@/lib/prisma';
import { checkInternalAuth, jsonResponse } from '@/lib/internal-api';

export const dynamic = 'force-dynamic'; // Всегда свежие данные

export async function GET(request: Request) {
  // 1. Проверка секретного ключа
  if (!checkInternalAuth(request)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    // 2. Запрос в базу данных
    const topUsers = await prisma.user.findMany({
      take: limit,
      orderBy: {
        points: 'desc', // Сортировка по убыванию баллов
      },
      select: {
        telegramId: true,
        firstName: true,
        username: true,
        points: true,
      },
    });

    return jsonResponse(topUsers);
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: 'Database error' }, 500);
  }
}