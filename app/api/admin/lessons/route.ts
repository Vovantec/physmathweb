// app/api/admin/lessons/route.ts
// Путь: app/api/admin/lessons/route.ts
// Изменение: после создания урока вызываем /api/internal/notify

import { NextResponse }   from 'next/server'
import { prisma }         from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

export async function POST(request: Request) {
  if (!await checkAdminAuth()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { title, videoUrl, imageUrl, taskId, pdfId } = await request.json()

    const lesson = await prisma.lesson.create({
      data: {
        title,
        videoUrl,
        imageUrl,
        pdfId,
        taskId: Number(taskId),
      },
      include: {
        task: { include: { course: { select: { title: true } } } },
      },
    })

    // ── Trigger Telegram notifications ────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://physmathlab.ru'
    fetch(`${baseUrl}/api/internal/notify`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': process.env.INTERNAL_API_KEY ?? '',
      },
      body: JSON.stringify({
        type:    'newLesson',
        refId:   String(lesson.id),
        payload: {
          lessonId:    lesson.id,
          lessonTitle: lesson.title,
          courseTitle: lesson.task.course.title,
        },
      }),
    }).catch(e => console.error('[notify lesson]', e))

    return NextResponse.json(lesson)
  } catch (e) {
    return NextResponse.json({ error: 'Error creating lesson' }, { status: 500 })
  }
}