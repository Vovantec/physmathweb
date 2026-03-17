// app/api/courses/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'self' | 'group' | null = all
    const userId = searchParams.get('userId') // telegramId string

    const courses = await prisma.course.findMany({
      where: type ? { courseType: type } : undefined,
      include: { tasks: true },
    })

    if (!userId) return NextResponse.json(courses)

    // Attach enrollment status for each course
    let user: { id: number } | null = null
    try {
      user = await prisma.user.findUnique({
        where: { telegramId: BigInt(userId) },
        select: { id: true },
      })
    } catch {}

    if (!user) return NextResponse.json(courses)

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId: user.id },
      select: { courseId: true, status: true },
    })
    const enrollMap = new Map(enrollments.map(e => [e.courseId, e.status]))

    const coursesWithStatus = courses.map(c => ({
      ...c,
      enrollmentStatus: enrollMap.get(c.id) ?? null,
    }))

    return NextResponse.json(coursesWithStatus)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const course = await prisma.course.create({
      data: {
        title: body.title,
        description: body.description,
        courseType: body.courseType || 'self',
        maxStudents: body.courseType === 'group' && body.maxStudents ? parseInt(body.maxStudents) : null,
      },
    })
    return NextResponse.json(course)
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка создания' }, { status: 500 })
  }
}