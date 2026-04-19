// app/api/admin/students/[id]/route.ts
// GET + PATCH for admin student profile

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdminAuth } from '@/lib/admin-auth';

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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await checkAdminAuth();
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { isPremium, questionsLimit, isCurator } = body;

    const updateData: any = {};
    if (isPremium !== undefined) updateData.isPremium = isPremium;
    if (questionsLimit !== undefined) updateData.questionsLimit = parseInt(questionsLimit);
    if (isCurator !== undefined) updateData.isCurator = isCurator;

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: { id: true, isPremium: true, questionsLimit: true, isCurator: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Ошибка обновления ролей:", error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}