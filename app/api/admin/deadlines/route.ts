// app/api/lessons/[id]/submit/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDeadlineStatus, DeadlinePolicy } from '@/lib/deadline'
import { REFERRAL_REWARDS } from '@/lib/referral'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userId, answers } = body

    if (!userId) {
      return NextResponse.json({ error: 'Вы не авторизованы' }, { status: 401 })
    }

    const lessonIdInt = parseInt(id)

    let tgIdBigInt: bigint
    try {
      tgIdBigInt = BigInt(userId)
    } catch {
      return NextResponse.json({ error: 'Неверный формат ID пользователя' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: tgIdBigInt },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден. Попробуйте перезайти.' },
        { status: 404 }
      )
    }

    // Load lesson with course deadline policy
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonIdInt },
      include: {
        questions: true,
        attempts: { where: { userId: tgIdBigInt } },
        task: {
          include: {
            course: {
              select: {
                id: true,
                deadlinePolicy: true,
                penaltyMultiplier: true,
              },
            },
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Урок не найден' }, { status: 404 })
    }

    // Check attempt limit
    if (lesson.attempts.length >= 2) {
      return NextResponse.json({ error: 'Попытки исчерпаны' }, { status: 403 })
    }

    // ── DEADLINE CHECK ─────────────────────────────────────
    const course = lesson.task.course
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId: course.id },
      },
    })

    const deadlineStatus = getDeadlineStatus(
      enrollment?.enrolledAt,
      lesson.deadlineOffsetDays,
      course.deadlinePolicy as DeadlinePolicy,
      course.penaltyMultiplier
    )

    if (deadlineStatus.isBlocked) {
      return NextResponse.json(
        {
          error: 'Дедлайн истёк. Сдача заданий заблокирована.',
          deadline: deadlineStatus.deadline,
        },
        { status: 403 }
      )
    }

    // ── GRADE ANSWERS ──────────────────────────────────────
    let correctCount = 0
    const totalCount = lesson.questions.length

    lesson.questions.forEach(q => {
      const userAns = (answers[q.id] || '').toString().trim().toLowerCase()
      const correctAns = q.answer.trim().toLowerCase()
      if (userAns === correctAns) correctCount++
    })

    const percent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

    // ── POINTS CALCULATION ─────────────────────────────────
    const isFirstAttempt = lesson.attempts.length === 0
    const previousMax =
      lesson.attempts.length > 0
        ? Math.max(...lesson.attempts.map(a => a.correct))
        : 0

    let pointsGained = 0
    let bonusGained = false
    const perfectBonus = 5

    if (correctCount > previousMax) {
      pointsGained += (correctCount - previousMax) * 2
    }

    if (correctCount === totalCount && isFirstAttempt) {
      pointsGained += perfectBonus
      bonusGained = true
    }

    // Apply penalty multiplier if late
    const effectivePoints = Math.round(pointsGained * deadlineStatus.penaltyMultiplier)

    // ── SAVE ───────────────────────────────────────────────
    await prisma.$transaction(async tx => {
      await tx.homeworkAttempt.create({
        data: {
          userId: tgIdBigInt,
          lessonId: lessonIdInt,
          correct: correctCount,
          total: totalCount,
          percent,
          answers: JSON.stringify(answers),
          isLate: deadlineStatus.isLate,
        },
      })

      if (effectivePoints > 0) {
        await tx.user.update({
          where: { telegramId: tgIdBigInt },
          data: { points: { increment: effectivePoints } },
        })
      }

      // ── REFERRAL BONUS: reward referrer on first HW ────
      if (isFirstAttempt && percent > 0) {
        const referral = await tx.referral.findUnique({
          where: { referredId: user.id },
        })
        if (referral) {
          const isVeryFirstHw =
            (await tx.homeworkAttempt.count({
              where: { userId: tgIdBigInt },
            })) === 1

          const bonus = isVeryFirstHw
            ? REFERRAL_REWARDS.ON_FIRST_HW
            : REFERRAL_REWARDS.PER_HW_BONUS

          await tx.user.update({
            where: { id: referral.referrerId },
            data: { referralPoints: { increment: bonus } },
          })
        }
      }
    })

    return NextResponse.json({
      success: true,
      results: {
        correct: correctCount,
        total: totalCount,
        percent,
        pointsGained: effectivePoints,
        bonusGained,
        attemptsLeft: 2 - (lesson.attempts.length + 1),
        isLate: deadlineStatus.isLate,
        penaltyApplied:
          deadlineStatus.isLate && course.deadlinePolicy === 'penalty',
        penaltyMultiplier: deadlineStatus.penaltyMultiplier,
      },
    })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}