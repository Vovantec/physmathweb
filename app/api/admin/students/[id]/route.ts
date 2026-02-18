import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

(BigInt.prototype as any).toJSON = function () { return this.toString(); };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        attempts: {
          include: {
            lesson: {
              include: {
                task: {
                  include: {
                    course: true
                  }
                }
              }
            }
          },
          orderBy: { id: 'desc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Студент не найден' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Ошибка загрузки профиля студента:", error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}