// app/api/admin/heatmap/route.ts
// GET /api/admin/heatmap?courseId=1  → full heatmap for admin
// GET /api/admin/heatmap?courseId=1&studentId=5 → single student

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function GET(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const courseId = parseInt(searchParams.get('courseId') ?? '0')
  const studentDbId = searchParams.get('studentId')
    ? parseInt(searchParams.get('studentId')!)
    : null

  if (!courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 })
  }

  return buildHeatmap(courseId, studentDbId)
}

// app/api/parent/heatmap/route.ts logic is separate (see parent route file)
// This shared function is reused by both
export async function buildHeatmap(courseId: number, studentDbId: number | null) {
  try {
    // Load course structure
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        tasks: {
          include: {
            lessons: {
              include: {
                questions: { select: { id: true, content: true } },
                attempts: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        username: true,
                        photoUrl: true,
                        telegramId: true,
                      },
                    },
                  },
                  where: studentDbId
                    ? { user: { id: studentDbId } }
                    : undefined,
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        },
      },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Collect all unique students
    const studentMap = new Map<number, {
      id: number
      firstName: string | null
      username: string | null
      photoUrl: string | null
      telegramId: string
    }>()

    for (const task of course.tasks) {
      for (const lesson of task.lessons) {
        for (const attempt of lesson.attempts) {
          if (!studentMap.has(attempt.user.id)) {
            studentMap.set(attempt.user.id, {
              id: attempt.user.id,
              firstName: attempt.user.firstName,
              username: attempt.user.username,
              photoUrl: attempt.user.photoUrl,
              telegramId: attempt.user.telegramId.toString(),
            })
          }
        }
      }
    }

    const students = Array.from(studentMap.values())

    // Build lesson cells
    const lessons = course.tasks.flatMap(task =>
      task.lessons.map(lesson => {
        // Per-question error analysis
        const questionStats = lesson.questions.map(q => {
          let correct = 0
          let total = 0
          for (const attempt of lesson.attempts) {
            if (!attempt.answers) continue
            try {
              const ans = JSON.parse(attempt.answers)
              total++
              if (
                (ans[q.id] ?? '').toString().trim().toLowerCase() ===
                q.content?.trim().toLowerCase()
              ) {
                correct++
              }
            } catch {}
          }
          return {
            questionId: q.id,
            content: q.content,
            successRate: total > 0 ? Math.round((correct / total) * 100) : null,
          }
        })

        // Per-student result for this lesson
        const studentResults = students.map(student => {
          const attempts = lesson.attempts.filter(
            a => a.user.id === student.id
          )
          if (attempts.length === 0) {
            return { studentId: student.id, status: 'not_started' as const, percent: null, isLate: false }
          }
          const best = attempts.reduce((a, b) => (a.percent > b.percent ? a : b))
          return {
            studentId: student.id,
            status: best.percent === 100
              ? ('perfect' as const)
              : best.percent >= 50
              ? ('partial' as const)
              : ('failed' as const),
            percent: best.percent,
            isLate: attempts.some(a => a.isLate),
          }
        })

        // Overall lesson stats
        const completedAttempts = lesson.attempts
        const avgPercent =
          completedAttempts.length > 0
            ? Math.round(
                completedAttempts.reduce((s, a) => s + a.percent, 0) /
                  completedAttempts.length
              )
            : null

        return {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          taskTitle: task.title,
          deadlineOffsetDays: lesson.deadlineOffsetDays,
          avgPercent,
          completedCount: completedAttempts.length,
          questionStats,
          studentResults,
        }
      })
    )

    return NextResponse.json({
      courseId,
      courseTitle: course.title,
      students,
      lessons,
    })
  } catch (error) {
    console.error('Heatmap error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}