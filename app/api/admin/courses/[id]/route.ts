// app/api/admin/courses/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
      include: {
        tasks: {
          include: {
            lessons: {
              include: {
                questions: true,
                attempts: true,
              },
            },
          },
        },
      },
    })

    if (!course) return NextResponse.json({ error: 'Курс не найден' }, { status: 404 })

    // Ensure new fields have defaults if migration not yet applied
    return NextResponse.json({
      courseType: 'self',
      maxStudents: null,
      deadlinePolicy: 'mark',
      penaltyMultiplier: 0.5,
      ...course,
      tasks: course.tasks.map(task => ({
        ...task,
        lessons: task.lessons.map(lesson => ({
          homeworkOpen: true,
          ...lesson,
        })),
      })),
    })
  } catch (error) {
    console.error('Ошибка загрузки курса в админке:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}