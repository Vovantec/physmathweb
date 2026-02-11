import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-secret');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Поддержка разных форматов: characterId или userId
    const characterId = body.characterId;
    const userId = body.userId;

    let arrMap = body.arrMap;

    // Если arrMap не передан, но переданы x/y - пробуем собрать (fallback)
    if (!arrMap && body.x !== undefined && body.y !== undefined) {
        arrMap = `${body.x}-${body.y}`;
    }

    const updateData: any = {};
    if (body.level !== undefined) updateData.level = Number(body.level);
    if (body.exp !== undefined) updateData.exp = Number(body.exp);
    if (body.hp !== undefined) updateData.hp = Number(body.hp);
    if (arrMap) updateData.arrMap = arrMap;
    if (body.inventory) updateData.inventory = body.inventory;

    // ОБНОВЛЕНИЕ
    if (characterId) {
        // Если есть ID персонажа - обновляем точечно (самый надежный способ)
        await prisma.character.update({
            where: { id: Number(characterId) },
            data: updateData
        });
    } else if (userId) {
        // Fallback: обновление по userId (менее точно)
        await prisma.character.updateMany({
            where: { userId: BigInt(userId), active: true },
            data: updateData
        });
    } else {
        return NextResponse.json({ error: 'Missing characterId or userId' }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (e) {
    console.error("Save Character Error:", e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}