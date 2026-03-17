// app/api/cron/route.ts
// Путь: app/api/cron/route.ts
//
// Вызывать каждый час, например через GitHub Actions:
//   curl -X POST https://physmathlab.ru/api/cron \
//     -H "x-cron-secret: $CRON_SECRET"

import { NextResponse } from 'next/server'
import { prisma }       from '@/lib/prisma'
import { sendTelegramNotification, broadcastNotification } from '@/lib/telegram-notify'
import { calcDeadline } from '@/lib/deadline'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

const CRON_SECRET = process.env.CRON_SECRET ?? ''

export async function POST(request: Request) {
  // Auth
  const secret = request.headers.get('x-cron-secret')
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, number> = {
    deadlineReminders: 0,
    prizesFinalized:   0,
  }

  // ── 1. DEADLINE REMINDERS ─────────────────────────────
  // Find all enrollments where a lesson deadline falls within next 24h
  const now        = new Date()
  const in24h      = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const windowEnd  = new Date(now.getTime() + 25 * 60 * 60 * 1000) // 24-25h window

  const enrollments = await prisma.courseEnrollment.findMany({
    include: {
      user:   { select: { id: true, firstName: true } },
      course: {
        include: {
          tasks: {
            include: {
              lessons: {
                where: { deadlineOffsetDays: { not: null } },
                select: { id: true, title: true, deadlineOffsetDays: true },
              },
            },
          },
        },
      },
    },
  })

  for (const enrollment of enrollments) {
    const user = enrollment.user
    for (const task of enrollment.course.tasks) {
      for (const lesson of task.lessons) {
        const deadline = calcDeadline(enrollment.enrolledAt, lesson.deadlineOffsetDays)
        if (!deadline) continue

        // Check if deadline falls in the 24-25h window from now
        if (deadline >= in24h && deadline <= windowEnd) {
          // Check user hasn't already submitted this lesson
          const attempt = await prisma.homeworkAttempt.findFirst({
            where: { userId: enrollment.user.telegramId ?? 0n as any, lessonId: lesson.id },
          })
          if (attempt) continue // already done

          const sent = await sendTelegramNotification({
            userId: user.id,
            type:   'deadlineReminder',
            text:   `⏰ <b>Напоминание о дедлайне</b>\n\nУрок «${lesson.title}» нужно сдать через 24 часа.\n\n<a href="https://physmathlab.ru/lesson/${lesson.id}">Перейти к уроку →</a>`,
            refId:  `deadline-${lesson.id}-${enrollment.enrolledAt.toISOString().slice(0, 10)}`,
          })

          if (sent) results.deadlineReminders++
        }
      }
    }
  }

  // ── 2. FINALIZE PRIZE POOLS ───────────────────────────
  // Find active pools whose endDate has passed (end of day)
  const expiredPools = await prisma.prizePool.findMany({
    where: {
      isFinished: false,
      isActive:   true,
      endDate:    { lte: now },
    },
    include: {
      placements: { include: { prize: true }, orderBy: { place: 'asc' } },
    },
  })

  for (const pool of expiredPools) {
    // Determine winners based on rating type and date range
    let winners: { userId: number; score: number }[] = []

    if (pool.ratingType === 'points') {
      // Sum points from attempts in the period
      const rows = await prisma.homeworkAttempt.groupBy({
        by:      ['userId'],
        where:   { createdAt: { gte: pool.startDate, lte: pool.endDate } },
        _sum:    { correct: true },
        orderBy: { _sum: { correct: 'desc' } },
        take:    pool.placesCount,
      })

      // Resolve User.id from telegramId
      for (const row of rows) {
        const u = await prisma.user.findUnique({
          where:  { telegramId: row.userId as any },
          select: { id: true },
        })
        if (u) winners.push({ userId: u.id, score: row._sum.correct ?? 0 })
      }
    } else {
      // referrals
      const rows = await prisma.referral.groupBy({
        by:      ['referrerId'],
        where:   { createdAt: { gte: pool.startDate, lte: pool.endDate } },
        _count:  { referredId: true },
        orderBy: { _count: { referredId: 'desc' } },
        take:    pool.placesCount,
      })
      winners = rows.map(r => ({ userId: r.referrerId, score: r._count.referredId }))
    }

    // Create PrizeAward records + notify winners
    for (let i = 0; i < Math.min(winners.length, pool.placesCount); i++) {
      const placement = pool.placements.find(p => p.place === i + 1)
      if (!placement) continue

      await prisma.prizeAward.upsert({
        where:  { poolId_place: { poolId: pool.id, place: i + 1 } },
        update: {},
        create: {
          id:       crypto.randomUUID(),
          poolId:   pool.id,
          place:    i + 1,
          winnerId: winners[i].userId,
          status:   'pending',
        },
      })

      // Notify winner
      const medalMap: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
      const medal = medalMap[i + 1] ?? `#${i + 1}`
      await sendTelegramNotification({
        userId: winners[i].userId,
        type:   'prizeAwarded',
        text:   `🎁 <b>Поздравляем!</b>\n\nВы заняли ${medal} место в розыгрыше «${pool.name}»!\nПриз: ${placement.prize.title}\n\nС вами скоро свяжется администратор.`,
        refId:  `prize-${pool.id}-${i + 1}`,
      })
    }

    // Mark pool as finished
    await prisma.prizePool.update({
      where: { id: pool.id },
      data:  { isFinished: true, isActive: false },
    })

    results.prizesFinalized++
  }

  return NextResponse.json({ ok: true, results })
}