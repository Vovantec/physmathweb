// app/api/admin/enrollments/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'
import { sendTelegramNotification } from '@/lib/telegram-notify'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function GET() {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { status: 'pending' },
    include: {
      user: { select: { id: true, firstName: true, username: true, photoUrl: true, telegramId: true } },
      course: { select: { id: true, title: true, courseType: true, maxStudents: true } },
    },
    orderBy: { enrolledAt: 'desc' },
  })

  return NextResponse.json(enrollments)
}

export async function PATCH(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { enrollmentId, action } = await request.json()
  if (!enrollmentId || !action) {
    return NextResponse.json({ error: 'enrollmentId and action required' }, { status: 400 })
  }

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      course: true,
      user: { select: { id: true, firstName: true } },
    },
  })
  if (!enrollment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://physmathlab.ru'

  if (action === 'approve') {
    // Проверка вместимости для очных курсов
    if (enrollment.course.courseType === 'group' && enrollment.course.maxStudents) {
      const activeCount = await prisma.courseEnrollment.count({
        where: { courseId: enrollment.courseId, status: 'active' },
      })
      if (activeCount >= enrollment.course.maxStudents) {
        return NextResponse.json({ error: 'Курс заполнен' }, { status: 400 })
      }
    }

    const updated = await prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'active' },
    })

    // Уведомление в Telegram
    await sendTelegramNotification({
      userId: enrollment.user.id,
      type:   'newLesson', // используем существующий тип, он включён по умолчанию
      text:   `✅ <b>Заявка одобрена!</b>\n\nВаша заявка на курс «${enrollment.course.title}» одобрена. Можете приступать к обучению!\n\n<a href="${baseUrl}/course/${enrollment.course.id}">Перейти к курсу →</a>`,
      refId:  `enrollment-approved-${enrollmentId}`,
    })

    return NextResponse.json(updated)
  }

  if (action === 'reject') {
    const updated = await prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'rejected' },
    })

    // Уведомление в Telegram
    await sendTelegramNotification({
      userId: enrollment.user.id,
      type:   'newLesson',
      text:   `❌ <b>Заявка отклонена</b>\n\nВаша заявка на курс «${enrollment.course.title}» была отклонена. Если у вас есть вопросы — обратитесь к администратору.`,
      refId:  `enrollment-rejected-${enrollmentId}`,
    })

    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}