import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Фикс для сериализации BigInt (важно для Telegram ID)
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
      include: {
        tasks: {
          include: {
            lessons: {
              include: {
                questions: true, // <--- БЕРЕМ ДЗ ВМЕСТЕ С ОТВЕТАМИ ТОЛЬКО ДЛЯ АДМИНА
                attempts: true
              }
            }
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Курс не найден' }, { status: 404 });
    }
    
    return NextResponse.json(course);
  } catch (error) {
    console.error("Ошибка загрузки курса в админке:", error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}