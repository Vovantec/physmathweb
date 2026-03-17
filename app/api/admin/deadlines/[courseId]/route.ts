// app/api/admin/deadlines/[courseId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { courseId } = await params
  const { deadlinePolicy, penaltyMultiplier, lessons } = await request.json()

  try {
    await prisma.$transaction([
      // Update course policy
      prisma.course.update({
        where: { id: parseInt(courseId) },
        data: { deadlinePolicy, penaltyMultiplier },
      }),
      // Update each lesson
      ...lessons.map((l: { id: number; deadlineOffsetDays: number | null; isFreeForReferrals: boolean }) =>
        prisma.lesson.update({
          where: { id: l.id },
          data: {
            deadlineOffsetDays: l.deadlineOffsetDays,
            isFreeForReferrals: l.isFreeForReferrals,
          },
        })
      ),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Deadline save error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}