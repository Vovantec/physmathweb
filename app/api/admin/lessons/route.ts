import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdminAuth } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!await checkAdminAuth()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { title, videoUrl, imageUrl, taskId, pdfId } = await request.json();
    
    const lesson = await prisma.lesson.create({
      data: {
        title,
        videoUrl,
        imageUrl,
        pdfId,
        taskId: Number(taskId),
      },
    });

    return NextResponse.json(lesson);
  } catch (e) {
    return NextResponse.json({ error: 'Error creating lesson' }, { status: 500 });
  }
}