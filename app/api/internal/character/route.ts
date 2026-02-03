import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-secret');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userIdStr = searchParams.get('userId');

  if (!userIdStr) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  try {
    // 1. Используем BigInt, так как telegramId - это большое число
    let telegramId;
    try {
        telegramId = BigInt(userIdStr);
    } catch (e) {
        return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
    }

    // 2. Ищем пользователя по telegramId (а не по id)
    const user = await prisma.user.findUnique({
        where: { telegramId: telegramId }, 
        include: {
            characters: {
                where: { active: true },
                take: 1
            }
        }
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found in DB' }, { status: 404 });
    }

    let characterData = null;

    // 3. Если персонаж есть — берем его
    if (user.characters && user.characters.length > 0) {
        characterData = user.characters[0];
    } else {
        // 4. Если персонажа нет — СОЗДАЕМ АВТОМАТИЧЕСКИ
        console.log(`Creating new character for user ${user.username || telegramId}`);
        characterData = await prisma.character.create({
            data: {
                userId: user.telegramId, // Связь через telegramId
                name: user.firstName || user.username || `Player`,
                class: 'Воин', // Класс по умолчанию
                // Остальные параметры (hp, lvl) заполнятся дефолтными значениями из схемы
            }
        });
    }

    // 5. Преобразуем BigInt в строку для JSON
    const character = {
        ...characterData,
        userId: characterData.userId.toString()
    };

    return NextResponse.json({ character });

  } catch (e) {
    console.error("Character API Error:", e);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}