import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, telegram_id, username, first_name, photo_url } = body;

    // 1. Проверяем, существует ли такой токен
    const authCode = await prisma.authCode.findUnique({ where: { token } });
    if (!authCode) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const tgId = BigInt(telegram_id);

    // 2. ОПРЕДЕЛЯЕМ ПРАВА АДМИНА
    const adminsStr = process.env.ADMINS || "";
    const adminIds = adminsStr.split(",").map(s => s.trim());
    const isAdmin = adminIds.includes(telegram_id.toString());

    // 3. Создаем или обновляем пользователя в базе (с полем isAdmin)
    await prisma.user.upsert({
      where: { telegramId: tgId },
      update: {
        username: username || null,
        firstName: first_name || null,
        photoUrl: photo_url || null,
        isAdmin: isAdmin,
      },
      create: {
        telegramId: tgId,
        username: username || null,
        firstName: first_name || null,
        photoUrl: photo_url || null,
        points: 0,
        isAdmin: isAdmin,
      }
    });

    // 4. Отмечаем токен как успешно подтвержденный
    await prisma.authCode.update({
      where: { token },
      data: {
        status: 'SUCCESS',
        userId: tgId
      }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}