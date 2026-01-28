import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Учим JSON работать с BigInt
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userIdStr = searchParams.get('userId');

  let targetTgId: bigint | undefined;

  // 1. Если передан ID пользователя, узнаем его Telegram ID
  if (userIdStr) {
    const internalId = parseInt(userIdStr);
    if (!isNaN(internalId)) {
        const user = await prisma.user.findUnique({
            where: { id: internalId }
        });
        if (user) {
            targetTgId = user.telegramId;
        }
    }
  }

  // 2. Загружаем курс с учетом найденного Telegram ID
  const course = await prisma.course.findUnique({
    where: { id: parseInt(id) },
    include: {
      tasks: {
        include: {
          lessons: {
            include: {
                // Если мы нашли TG ID, фильтруем попытки по нему
                attempts: targetTgId ? {
                    where: { userId: targetTgId },
                    select: { percent: true, id: true }
                } : false
            }
          }
        }
      }
    }
  });

  if (!course) return NextResponse.json({ error: 'Курс не найден' }, { status: 404 });
  
  return NextResponse.json(course);
}