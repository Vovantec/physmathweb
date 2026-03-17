// app/api/courses/[id]/apply/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await request.json()

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(userId) } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const courseId = parseInt(id)
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    // Check if already enrolled or pending
    const existing = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    })

    if (existing) {
      if (existing.status === 'active') return NextResponse.json({ status: 'active' })
      if (existing.status === 'pending') return NextResponse.json({ status: 'pending' })
      if (existing.status === 'rejected') {
        // Allow re-apply
        const updated = await prisma.courseEnrollment.update({
          where: { id: existing.id },
          data: { status: 'pending' },
        })
        return NextResponse.json({ status: updated.status })
      }
    }

    // Для group курсов проверяем лимит
    if (course.courseType === 'group' && course.maxStudents) {
      const activeCount = await prisma.courseEnrollment.count({
        where: { courseId, status: 'active' },
      })
      if (activeCount >= course.maxStudents) {
        return NextResponse.json({ error: 'Курс заполнен', full: true }, { status: 400 })
      }
    }

    const status = 'pending' // Both types require approval (self = future payment)
    const enrollment = await prisma.courseEnrollment.create({
      data: { userId: user.id, courseId, status },
    })

    return NextResponse.json({ status: enrollment.status })
  } catch (error) {
    console.error('Apply error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}