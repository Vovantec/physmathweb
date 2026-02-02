import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-secret');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { userId, addMoney, addItems } = await request.json();

    if (!userId) return NextResponse.json({ error: 'No userId' }, { status: 400 });

    // 1. Получаем персонажа
    // Внимание: userId у нас BigInt (Telegram ID), ищем через User
    const character = await prisma.character.findFirst({
      where: { userId: BigInt(userId), active: true }
    });

    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    // 2. Парсим инвентарь
    let inventory = [];
    try {
      inventory = JSON.parse(character.inventory);
    } catch (e) {
      inventory = [];
    }

    // 3. Добавляем деньги (как предмет с id 'coins' или обновляем поле)
    // В старой логике монеты лежали в инвентаре
    if (addMoney > 0) {
      const coinItem = inventory.find((i: any) => i.coins === true || i.id === 'coins');
      if (coinItem) {
        coinItem.count = (coinItem.count || 0) + addMoney;
      } else {
        inventory.push({ id: 'coins', coins: true, count: addMoney, pos: -1 });
      }
    }

    // 4. Добавляем предметы
    if (Array.isArray(addItems) && addItems.length > 0) {
      // Находим первый свободный слот (с 15 по 100)
      for (const itemId of addItems) {
        let placed = false;
        for (let i = 15; i < 100; i++) {
          if (!inventory.find((item: any) => item.pos === i)) {
            inventory.push({ id: itemId, pos: i, count: 1 });
            placed = true;
            break;
          }
        }
        if (!placed) {
            // Инвентарь полон - можно добавить логику отправки на почту или просто игнор
            console.log(`Inventory full for user ${userId}`);
        }
      }
    }

    // 5. Сохраняем
    await prisma.character.update({
      where: { id: character.id },
      data: { inventory: JSON.stringify(inventory) }
    });

    return NextResponse.json({ success: true });

  } catch (e) {
    console.error("Reward API Error:", e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}