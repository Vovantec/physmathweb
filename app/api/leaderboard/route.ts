// app/api/leaderboard/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'points'   // "points" | "referrals"
  const period = searchParams.get('period') ?? 'all'  // "month" | "all"
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  try {
    if (type === 'points') {
      // ── TOP BY POINTS ──────────────────────────────────
      let whereClause = {}

      if (period === 'month') {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        // For monthly: aggregate points from attempts this month
        const monthlyPoints = await prisma.homeworkAttempt.groupBy({
          by: ['userId'],
          where: { createdAt: { gte: startOfMonth } },
          _sum: { correct: true },
          orderBy: { _sum: { correct: 'desc' } },
          take: limit,
        })

        const userIds = monthlyPoints.map(r => r.userId)
        const users = await prisma.user.findMany({
          where: { telegramId: { in: userIds } },
          select: {
            telegramId: true,
            firstName: true,
            username: true,
            photoUrl: true,
            points: true,
          },
        })

        const result = monthlyPoints.map((entry, idx) => {
          const user = users.find(u => u.telegramId === entry.userId)
          return {
            rank: idx + 1,
            telegramId: entry.userId.toString(),
            firstName: user?.firstName ?? 'Аноним',
            username: user?.username ?? null,
            photoUrl: user?.photoUrl ?? null,
            score: entry._sum.correct ?? 0,
            totalPoints: user?.points ?? 0,
          }
        })

        return NextResponse.json({ type: 'points', period, data: result })
      }

      // All-time top by points
      const users = await prisma.user.findMany({
        orderBy: { points: 'desc' },
        take: limit,
        select: {
          telegramId: true,
          firstName: true,
          username: true,
          photoUrl: true,
          points: true,
          _count: { select: { attempts: true } },
        },
      })

      const result = users.map((u, idx) => ({
        rank: idx + 1,
        telegramId: u.telegramId.toString(),
        firstName: u.firstName ?? 'Аноним',
        username: u.username ?? null,
        photoUrl: u.photoUrl ?? null,
        score: u.points,
        homeworkDone: u._count.attempts,
      }))

      return NextResponse.json({ type: 'points', period, data: result })
    }

    if (type === 'referrals') {
      // ── TOP REFERRERS ──────────────────────────────────
      const referralCounts = await prisma.referral.groupBy({
        by: ['referrerId'],
        _count: { referredId: true },
        orderBy: { _count: { referredId: 'desc' } },
        take: limit,
      })

      const userIds = referralCounts.map(r => r.referrerId)
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          telegramId: true,
          firstName: true,
          username: true,
          photoUrl: true,
          referralPoints: true,
        },
      })

      const result = referralCounts.map((entry, idx) => {
        const user = users.find(u => u.id === entry.referrerId)
        return {
          rank: idx + 1,
          telegramId: user?.telegramId.toString() ?? '',
          firstName: user?.firstName ?? 'Аноним',
          username: user?.username ?? null,
          photoUrl: user?.photoUrl ?? null,
          score: entry._count.referredId,
          referralPoints: user?.referralPoints ?? 0,
          prize: getPrize(idx + 1),
        }
      })

      return NextResponse.json({ type: 'referrals', period: 'all', data: result })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function getPrize(rank: number): string | null {
  if (rank === 1) return '🏆 Книга + Фирменный мерч'
  if (rank === 2) return '🥈 Книга'
  if (rank === 3) return '🥉 Фирменный мерч'
  return null
}