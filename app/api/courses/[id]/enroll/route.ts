// app/api/courses/[id]/enroll/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Find user by telegramId
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(userId) },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const courseId = parseInt(id)

    // Upsert enrollment — safe to call multiple times
    const enrollment = await prisma.courseEnrollment.upsert({
      where: {
        userId_courseId: { userId: user.id, courseId },
      },
      update: {},  // already enrolled — don't change enrolledAt
      create: {
        userId: user.id,
        courseId,
      },
    })

    return NextResponse.json({
      enrolled: true,
      enrolledAt: enrollment.enrolledAt,
    })
  } catch (error) {
    console.error('Enrollment error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ enrolled: false, enrolledAt: null })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(userId) },
    })

    if (!user) return NextResponse.json({ enrolled: false, enrolledAt: null })

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId: parseInt(id) },
      },
    })

    return NextResponse.json({
      enrolled: !!enrollment,
      enrolledAt: enrollment?.enrolledAt ?? null,
    })
  } catch {
    return NextResponse.json({ enrolled: false, enrolledAt: null })
  }
}