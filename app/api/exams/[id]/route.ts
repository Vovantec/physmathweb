// app/api/exams/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  const variant = await prisma.examVariant.findUnique({
    where: { id: parseInt(id), isPublished: true },
    include: { tasks: { orderBy: { order: 'asc' } } },
  })
  if (!variant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!userId) return NextResponse.json(variant)

  let user: { id: number } | null = null
  try {
    user = await prisma.user.findUnique({ where: { telegramId: BigInt(userId) }, select: { id: true } })
  } catch {}

  if (!user) return NextResponse.json(variant)

  // Get student's attempt with answers and feedbacks
  const attempt = await prisma.examAttempt.findUnique({
    where: { studentId_variantId: { studentId: user.id, variantId: parseInt(id) } },
    include: {
      answers: true,
      feedbacks: true,
    },
  })

  return NextResponse.json({ ...variant, attempt })
}