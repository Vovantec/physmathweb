// Добавить в app/api/lessons/[id]/route.ts — нужно вернуть homeworkOpen и courseType
// Текущий GET уже возвращает весь lesson из Prisma, но нам нужны поля из Course

// Обновлённый GET в app/api/lessons/[id]/route.ts:
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const userIdStr = searchParams.get('userId')

  let targetTgId: bigint | undefined

  if (userIdStr && userIdStr !== 'null' && userIdStr !== 'undefined') {
    try { targetTgId = BigInt(userIdStr) } catch (e) { console.error('Неверный формат userId:', userIdStr) }
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: parseInt(id) },
    include: {
      questions: true,
      task: {
        include: {
          course: {
            select: {
              id: true,
              deadlinePolicy: true,
              penaltyMultiplier: true,
              courseType: true,   // NEW
            }
          }
        }
      },
      attempts: targetTgId ? {
        where: { userId: targetTgId },
        orderBy: { createdAt: 'asc' },
      } : false,
    },
  })

  if (!lesson) return NextResponse.json({ error: 'Урок не найден' }, { status: 404 })

  const lessonWithAttempts = { ...lesson, attempts: lesson.attempts || [] }

  const safeLesson = JSON.parse(JSON.stringify(lessonWithAttempts, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ))

  return NextResponse.json(safeLesson)
}