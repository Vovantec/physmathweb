import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

(BigInt.prototype as any).toJSON = function () { return this.toString(); };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userIdStr = searchParams.get('userId');

  let targetTgId: bigint | undefined;

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

  const course = await prisma.course.findUnique({
    where: { id: parseInt(id) },
    include: {
      tasks: {
        include: {
          lessons: {
            include: {
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