// app/api/admin/exam-tickets/[attemptId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { NextRequest } from 'next/server'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

// GET — полный тикет с заданиями, ответами, фидбеком
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.isAdmin && !(user as any).isCurator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { attemptId } = await params

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: parseInt(attemptId) },
    include: {
      student: { select: { id: true, firstName: true, username: true, photoUrl: true, telegramId: true } },
      variant: {
        include: { tasks: { orderBy: { order: 'asc' } } },
      },
      answers: true,
      feedbacks: true,
    },
  })

  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(attempt)
}

// PATCH — куратор берёт тикет, оставляет фидбек, закрывает
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.isAdmin && !(user as any).isCurator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { attemptId } = await params
  const body = await request.json()
  const { action, feedbacks, curatorNote, part2Score } = body
  // action: 'take' | 'save_feedback' | 'send_revision' | 'close'

  const attempt = await prisma.examAttempt.findUnique({ where: { id: parseInt(attemptId) } })
  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Take ticket
  if (action === 'take') {
    const updated = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: { status: 'reviewing', curatorId: user.id },
    })
    return NextResponse.json(updated)
  }

  // Save feedback per task
  if (action === 'save_feedback' && feedbacks) {
    for (const fb of feedbacks as Array<{
      taskId: number; isCorrect?: boolean; score?: number; comment?: string; imageUrl?: string
    }>) {
      await prisma.examFeedback.upsert({
        where: { attemptId_taskId: { attemptId: attempt.id, taskId: fb.taskId } },
        update: {
          isCorrect: fb.isCorrect ?? null,
          score: fb.score ?? null,
          comment: fb.comment || null,
          imageUrl: fb.imageUrl || null,
          curatorId: user.id,
        },
        create: {
          attemptId: attempt.id,
          taskId: fb.taskId,
          isCorrect: fb.isCorrect ?? null,
          score: fb.score ?? null,
          comment: fb.comment || null,
          imageUrl: fb.imageUrl || null,
          curatorId: user.id,
        },
      })
    }
    // Recalculate part2Score
    const allFb = await prisma.examFeedback.findMany({ where: { attemptId: attempt.id } })
    const p2 = allFb.reduce((s, f) => s + (f.score ?? 0), 0)
    const total = (attempt.part1Score ?? 0) + p2
    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: { part2Score: p2, totalScore: total, curatorNote: curatorNote || null },
    })
    return NextResponse.json({ success: true })
  }

  // Send to revision
  if (action === 'send_revision') {
    const updated = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: { status: 'revision', curatorNote: curatorNote || null },
    })
    return NextResponse.json(updated)
  }

  // Close ticket
  if (action === 'close') {
    const allFb = await prisma.examFeedback.findMany({ where: { attemptId: attempt.id } })
    const p2 = allFb.reduce((s, f) => s + (f.score ?? 0), 0)
    const total = (attempt.part1Score ?? 0) + p2
    const updated = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'closed',
        part2Score: p2,
        totalScore: total,
        curatorNote: curatorNote || attempt.curatorNote,
        closedAt: new Date(),
      },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}