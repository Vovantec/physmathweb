// app/api/admin/questions/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const data = await req.json()

    // Get max order for this lesson's questions
    const maxOrder = await prisma.question.aggregate({
      where: { lessonId: Number(data.lessonId) },
      _max: { order: true },
    })
    const nextOrder = (maxOrder._max.order ?? 0) + 1

    const question = await prisma.question.create({
      data: {
        type: data.type,
        content: data.content,
        answer: data.answer,
        videoUrl: data.videoUrl || null,
        imageUrl: data.imageUrl || null,
        lessonId: Number(data.lessonId),
        order: nextOrder,
      },
    })

    return NextResponse.json({ success: true, question })
  } catch (error) {
    console.error('Ошибка при сохранении ДЗ:', error)
    return NextResponse.json({ error: 'Ошибка сервера при сохранении' }, { status: 500 })
  }
}