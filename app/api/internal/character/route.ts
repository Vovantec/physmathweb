import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-secret');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userIdStr = searchParams.get('userId'); // Получаем как строку

  if (!userIdStr) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  try {
    // ПРЕОБРАЗУЕМ В ЧИСЛО (FIX)
    const userId = parseInt(userIdStr);
    
    if (isNaN(userId)) {
        return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId }, // Теперь здесь число, и Prisma довольна
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

    // Prisma возвращает BigInt, который нельзя сразу отправить в JSON
    // Преобразуем userId (BigInt) в строку
    const character = {
        ...user.characters[0],
        userId: user.characters[0].userId.toString()
    };

    return NextResponse.json({ character });

  } catch (e) {
    console.error("Character API Error:", e);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}