import { prisma } from '@/lib/prisma';
import { checkInternalAuth, jsonResponse } from '@/lib/internal-api';

export async function POST(request: Request) {
  if (!checkInternalAuth(request)) return jsonResponse({ error: 'Unauthorized' }, 401);

  try {
    const { telegramId, amount, reason } = await request.json(); // reason можно логировать, если нужно

    if (!telegramId || !amount) return jsonResponse({ error: 'Invalid data' }, 400);

    const user = await prisma.user.update({
      where: { telegramId: BigInt(telegramId) },
      data: {
        points: { increment: Number(amount) }
      }
    });

    return jsonResponse({ success: true, newBalance: user.points });
  } catch (e) {
    return jsonResponse({ error: 'User not found or DB error' }, 404);
  }
}