// app/api/courses/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'self' | 'group' | null = all
    const userId = searchParams.get('userId')

    // Fetch courses — фильтр по courseType применяем только если колонка существует
    let courses: any[] = []
    try {
      courses = await prisma.course.findMany({
        where: type ? { courseType: type } : undefined,
        include: { tasks: true },
      })
    } catch (e: any) {
      // Если колонка courseType ещё не добавлена (миграция не выполнена) — fallback без фильтра
      if (e?.message?.includes('courseType') || e?.code === 'P2025') {
        courses = await prisma.course.findMany({ include: { tasks: true } })
      } else {
        throw e
      }
    }

    // Добавляем дефолтные поля если миграция не выполнена
    courses = courses.map(c => ({
      courseType: 'self',
      maxStudents: null,
      ...c,
    }))

    if (!userId) return NextResponse.json(courses)

    // Attach enrollment status
    let user: { id: number } | null = null
    try {
      user = await prisma.user.findUnique({
        where: { telegramId: BigInt(userId) },
        select: { id: true },
      })
    } catch {}

    if (!user) return NextResponse.json(courses)

    // Fetch enrollments — с fallback если колонка status не существует
    let enrollments: { courseId: number; status: string }[] = []
    try {
      enrollments = await prisma.courseEnrollment.findMany({
        where: { userId: user.id },
        select: { courseId: true, status: true },
      })
    } catch {
      // status колонка не добавлена — считаем все активными
      const raw = await prisma.courseEnrollment.findMany({
        where: { userId: user.id },
        select: { courseId: true },
      })
      enrollments = raw.map(e => ({ ...e, status: 'active' }))
    }

    const enrollMap = new Map(enrollments.map(e => [e.courseId, e.status]))

    const coursesWithStatus = courses.map(c => ({
      ...c,
      enrollmentStatus: enrollMap.get(c.id) ?? null,
    }))

    return NextResponse.json(coursesWithStatus)
  } catch (error) {
    console.error('[/api/courses] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data: any = {
      title: body.title,
      description: body.description,
    }
    // Добавляем новые поля только если они есть в теле запроса
    if (body.courseType !== undefined) data.courseType = body.courseType || 'self'
    if (body.courseType === 'group' && body.maxStudents) data.maxStudents = parseInt(body.maxStudents)

    const course = await prisma.course.create({ data })
    return NextResponse.json(course)
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка создания' }, { status: 500 })
  }
}