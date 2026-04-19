// app/api/exams/[id]/attempt/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

// POST — создать или сохранить черновик / отправить на проверку
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const variantId = parseInt(id)
  const body = await request.json()
  const { userId, answers, action } = body
  // action: 'save' | 'submit'

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  let user: { id: number } | null = null
  try {
    user = await prisma.user.findUnique({ where: { telegramId: BigInt(userId) }, select: { id: true } })
  } catch {}
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const variant = await prisma.examVariant.findUnique({
    where: { id: variantId },
    include: { tasks: true },
  })
  if (!variant) return NextResponse.json({ error: 'Variant not found' }, { status: 404 })

  // Get or create attempt
  let attempt = await prisma.examAttempt.findUnique({
    where: { studentId_variantId: { studentId: user.id, variantId } },
  })

  if (!attempt) {
    attempt = await prisma.examAttempt.create({
      data: { studentId: user.id, variantId, status: 'draft' },
    })
  }

  // Can't re-submit if already submitted/reviewing/closed
  if (action === 'submit' && ['submitted', 'reviewing', 'closed'].includes(attempt.status)) {
    return NextResponse.json({ error: 'Already submitted' }, { status: 400 })
  }

  // Save answers
  if (answers && typeof answers === 'object') {
    for (const [taskIdStr, answerData] of Object.entries(answers as Record<string, any>)) {
      const taskId = parseInt(taskIdStr)
      await prisma.examAnswer.upsert({
        where: { attemptId_taskId: { attemptId: attempt.id, taskId } },
        update: {
          textAnswer: answerData.textAnswer || null,
          imageUrl: answerData.imageUrl || null,
        },
        create: {
          attemptId: attempt.id,
          taskId,
          textAnswer: answerData.textAnswer || null,
          imageUrl: answerData.imageUrl || null,
        },
      })
    }
  }

  // Submit: auto-check part 1, mark as submitted
  if (action === 'submit') {
    const savedAnswers = await prisma.examAnswer.findMany({ where: { attemptId: attempt.id } })
    const answerMap = new Map(savedAnswers.map(a => [a.taskId, a]))

    let part1Score = 0
    const part1Tasks = variant.tasks.filter(t => t.part === 1)

    for (const task of part1Tasks) {
      const ans = answerMap.get(task.id)
      if (ans?.textAnswer && task.answer) {
        const userAns = ans.textAnswer.trim().toLowerCase()
        const correct = task.answer.trim().toLowerCase()
        if (userAns === correct) part1Score += task.maxScore
      }
    }

    attempt = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'submitted',
        part1Score,
        submittedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      attempt,
      part1Score,
      part1Total: part1Tasks.reduce((s, t) => s + t.maxScore, 0),
      autoChecked: part1Tasks.length,
    })
  }

  // Just save draft
  return NextResponse.json({ success: true, attempt, saved: true })
}