import { prisma } from '@/lib/prisma';
import { checkInternalAuth, jsonResponse } from '@/lib/internal-api';

// Получение пользователя по telegramId
export async function GET(request: Request) {
  if (!checkInternalAuth(request)) return jsonResponse({ error: 'Unauthorized' }, 401);

  const { searchParams } = new URL(request.url);
  const tid = searchParams.get('telegramId');

  if (!tid) return jsonResponse({ error: 'Missing telegramId' }, 400);

  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(tid) }
  });

  if (!user) return jsonResponse({ error: 'User not found' }, 404);

  return jsonResponse(user);
}

// Создание или обновление пользователя (для Бота)
export async function POST(request: Request) {
  if (!checkInternalAuth(request)) return jsonResponse({ error: 'Unauthorized' }, 401);

  try {
    const body = await request.json();
    const { telegramId, username, firstName, photoUrl } = body;

    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(telegramId) },
      update: {
        username: username || undefined,
        firstName: firstName || undefined,
        photoUrl: photoUrl || undefined,
      },
      create: {
        telegramId: BigInt(telegramId),
        username,
        firstName,
        photoUrl,
        points: 0
      }
    });

    return jsonResponse(user);
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: 'Internal error' }, 500);
  }
}