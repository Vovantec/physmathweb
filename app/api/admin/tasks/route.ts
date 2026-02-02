import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdminAuth } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!await checkAdminAuth(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { title, courseId } = await request.json();
    
    const task = await prisma.task.create({
      data: {
        title,
        courseId: Number(courseId),
      },
    });

    return NextResponse.json(task);
  } catch (e) {
    return NextResponse.json({ error: 'Error creating task' }, { status: 500 });
  }
}