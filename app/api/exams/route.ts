// app/api/exams/route.ts — список опубликованных вариантов для студента
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const subject = searchParams.get('subject')
  const userId = searchParams.get('userId')

  const variants = await prisma.examVariant.findMany({
    where: {
      isPublished: true,
      ...(subject && { subject }),
    },
    orderBy: [{ subject: 'asc' }, { year: 'desc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { tasks: true } },
    },
  })

  if (!userId) return NextResponse.json(variants)

  // Attach attempt status per variant
  let user: { id: number } | null = null
  try {
    user = await prisma.user.findUnique({ where: { telegramId: BigInt(userId) }, select: { id: true } })
  } catch {}

  if (!user) return NextResponse.json(variants)

  const attempts = await prisma.examAttempt.findMany({
    where: { studentId: user.id },
    select: { variantId: true, status: true, totalScore: true, part1Score: true, part2Score: true },
  })
  const attemptMap = new Map(attempts.map(a => [a.variantId, a]))

  return NextResponse.json(variants.map(v => ({
    ...v,
    attempt: attemptMap.get(v.id) ?? null,
  })))
}