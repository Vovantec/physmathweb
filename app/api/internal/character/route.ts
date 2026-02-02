import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-secret');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  try {
    // Ищем активного персонажа пользователя
    // Предполагаем, что связь User -> Character уже настроена или мы ищем по login
    // Для простоты найдем персонажа, связанного с User ID
    
    // ВАЖНО: Адаптируйте запрос под вашу схему. 
    // Если у User есть relation "characters":
    const user = await prisma.user.findUnique({
        where: { id: userId }, // или telegramId, если вы используете BigInt
        include: {
            // Предполагаем, что у вас есть модель Character
            // Если нет, нужно будет создать или адаптировать запрос
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

    return NextResponse.json({ character });

  } catch (e) {
    console.error("Character API Error:", e);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}