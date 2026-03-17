// app/api/parent/[token]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildHeatmap } from '@/app/api/admin/heatmap/route'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { searchParams } = new URL(request.url)
  const courseId = parseInt(searchParams.get('courseId') ?? '0')

  // Validate token
  const access = await prisma.parentAccess.findUnique({
    where: { token },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          username: true,
          photoUrl: true,
          points: true,
          attempts: {
            include: {
              lesson: {
                include: { task: { include: { course: true } } },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  })

  if (!access) {
    return NextResponse.json({ error: 'Ссылка недействительна' }, { status: 404 })
  }

  if (access.expiresAt && new Date() > access.expiresAt) {
    return NextResponse.json({ error: 'Ссылка истекла' }, { status: 403 })
  }

  const student = access.student

  // Build stats summary
  const totalAttempts = student.attempts.length
  const completedHw = student.attempts.filter(a => a.percent === 100).length
  const avgPercent =
    totalAttempts > 0
      ? Math.round(
          student.attempts.reduce((s, a) => s + a.percent, 0) / totalAttempts
        )
      : 0
  const lateCount = student.attempts.filter((a: any) => a.isLate).length

  // Group by course
  const courseMap = new Map<number, { title: string; attempts: typeof student.attempts }>()
  for (const attempt of student.attempts) {
    const course = attempt.lesson.task.course
    if (!courseMap.has(course.id)) {
      courseMap.set(course.id, { title: course.title, attempts: [] })
    }
    courseMap.get(course.id)!.attempts.push(attempt)
  }

  const courses = Array.from(courseMap.entries()).map(([id, data]) => ({
    courseId: id,
    courseTitle: data.title,
    attemptCount: data.attempts.length,
    avgPercent:
      data.attempts.length > 0
        ? Math.round(
            data.attempts.reduce((s, a) => s + a.percent, 0) / data.attempts.length
          )
        : 0,
  }))

  // If courseId provided, also return heatmap
  let heatmapData = null
  if (courseId) {
    const heatmapResponse = await buildHeatmap(courseId, student.id)
    heatmapData = await heatmapResponse.json()
  }

  return NextResponse.json({
    student: {
      firstName: student.firstName,
      username: student.username,
      photoUrl: student.photoUrl,
      points: student.points,
    },
    summary: {
      totalAttempts,
      completedHw,
      avgPercent,
      lateCount,
    },
    courses,
    heatmap: heatmapData,
    label: access.label,
  })
}