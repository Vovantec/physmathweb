import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdminAuth } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!await checkAdminAuth(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { title, videoUrl, taskId, pdfId } = await request.json();
    
    const lesson = await prisma.lesson.create({
      data: {
        title,
        videoUrl,
        pdfId, // ID файла на Google Drive или ссылка
        taskId: Number(taskId),
      },
    });

    return NextResponse.json(lesson);
  } catch (e) {
    return NextResponse.json({ error: 'Error creating lesson' }, { status: 500 });
  }
}