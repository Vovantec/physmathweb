// app/api/admin/heatmap/route.ts
// Путь: app/api/admin/heatmap/route.ts
// GET ?courseId=1&from=2024-01-01&to=2024-12-31&studentIds=1,2,3

import { NextResponse }   from 'next/server'
import { prisma }         from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function GET(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const courseId   = parseInt(searchParams.get('courseId') ?? '0')
  const fromStr    = searchParams.get('from')
  const toStr      = searchParams.get('to')
  const studentIdsStr = searchParams.get('studentIds') // comma-separated User.id

  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  const dateFilter: any = {}
  if (fromStr) dateFilter.gte = new Date(fromStr)
  if (toStr)   dateFilter.lte = new Date(new Date(toStr).setHours(23, 59, 59, 999))

  const selectedStudentIds = studentIdsStr
    ? studentIdsStr.split(',').map(Number).filter(Boolean)
    : null

  return NextResponse.json(await buildHeatmap(courseId, selectedStudentIds, Object.keys(dateFilter).length ? dateFilter : undefined))
}

export async function buildHeatmap(
  courseId: number,
  studentDbIds: number[] | null,
  dateFilter?: { gte?: Date; lte?: Date }
) {
  const course = await prisma.course.findUnique({
    where:   { id: courseId },
    include: {
      tasks: {
        include: {
          lessons: {
            include: {
              questions: { select: { id: true, content: true } },
              attempts: {
                where: {
                  ...(studentDbIds ? { user: { id: { in: studentDbIds } } } : {}),
                  ...(dateFilter   ? { createdAt: dateFilter }             : {}),
                },
                include: {
                  user: {
                    select: { id: true, firstName: true, username: true, photoUrl: true, telegramId: true },
                  },
                },
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      },
    },
  })

  if (!course) return { error: 'Course not found' }

  // Collect unique students
  const studentMap = new Map<number, any>()
  for (const task of course.tasks) {
    for (const lesson of task.lessons) {
      for (const attempt of lesson.attempts) {
        if (!studentMap.has(attempt.user.id)) {
          studentMap.set(attempt.user.id, {
            id:         attempt.user.id,
            firstName:  attempt.user.firstName,
            username:   attempt.user.username,
            photoUrl:   attempt.user.photoUrl,
            telegramId: attempt.user.telegramId.toString(),
          })
        }
      }
    }
  }
  const students = Array.from(studentMap.values())

  const lessons = course.tasks.flatMap(task =>
    task.lessons.map(lesson => {
      const studentResults = students.map(student => {
        const attempts = lesson.attempts.filter(a => a.user.id === student.id)
        if (!attempts.length) return { studentId: student.id, status: 'not_started', percent: null, isLate: false }
        const best = attempts.reduce((a, b) => (a.percent > b.percent ? a : b))
        return {
          studentId: student.id,
          status:    best.percent === 100 ? 'perfect' : best.percent >= 50 ? 'partial' : 'failed',
          percent:   best.percent,
          isLate:    attempts.some(a => a.isLate),
        }
      })

      const avgPercent = lesson.attempts.length
        ? Math.round(lesson.attempts.reduce((s, a) => s + a.percent, 0) / lesson.attempts.length)
        : null

      return {
        lessonId:       lesson.id,
        lessonTitle:    lesson.title,
        taskTitle:      task.title,
        deadlineOffsetDays: lesson.deadlineOffsetDays,
        avgPercent,
        completedCount: lesson.attempts.length,
        studentResults,
      }
    })
  )

  return { courseId, courseTitle: course.title, students, lessons }
}