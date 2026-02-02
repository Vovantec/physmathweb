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
    // 1. Преобразуем ID в число (FIX)
    const userId = parseInt(userIdStr);
    
    if (isNaN(userId)) {
        return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
    }

    // 2. Ищем пользователя по ID
    const user = await prisma.user.findUnique({
      where: { id: userId }, 
      include: {
        characters: {
            where: { active: true },
            take: 1
        }
      }
    });

    if (!user || !user.characters || user.characters.length === 0) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const character = user.characters[0];

    // 3. Сериализация BigInt (Prisma возвращает BigInt, который JSON.stringify не любит)
    // Преобразуем userId (BigInt) в строку перед отправкой
    const safeCharacter = {
        ...character,
        userId: character.userId.toString() 
    };

    return NextResponse.json({ character: safeCharacter });

  } catch (e) {
    console.error("Character API Error:", e);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}