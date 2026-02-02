import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  // Проверка ключа API
  const apiKey = request.headers.get('x-api-secret');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Загружаем все данные параллельно
    const [items, npcs, dialogs, quests] = await Promise.all([
      prisma.item.findMany(),
      prisma.nPC.findMany(),
      prisma.dialog.findMany(),
      prisma.quest.findMany(),
    ]);

    return NextResponse.json({
      items,
      npcs,
      dialogs,
      quests
    });
  } catch (e) {
    console.error("GameData API Error:", e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}