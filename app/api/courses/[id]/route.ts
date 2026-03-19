// app/api/courses/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const userIdStr = searchParams.get('userId')

  let targetTgId: bigint | undefined

  if (userIdStr && userIdStr !== 'null' && userIdStr !== 'undefined') {
    try { targetTgId = BigInt(userIdStr) } catch (e) { console.error('Неверный формат userId:', userIdStr) }
  }

  const course = await prisma.course.findUnique({
    where: { id: parseInt(id) },
    include: {
      tasks: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              attempts: targetTgId ? {
                where: { userId: targetTgId },
                select: { percent: true, id: true },
              } : false,
            },
          },
        },
      },
    },
  })

  if (!course) return NextResponse.json({ error: 'Курс не найден' }, { status: 404 })

  return NextResponse.json({
    courseType: 'self',
    maxStudents: null,
    ...course,
    tasks: course.tasks.map(task => ({
      ...task,
      lessons: task.lessons.map(lesson => ({
        homeworkOpen: true,
        ...lesson,
      })),
    })),
  })
}