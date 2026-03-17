// app/api/prizes/route.ts
// Путь: app/api/prizes/route.ts
// Публичный — отдаёт завершённые розыгрыши с победителями для /leaderboard

import { NextResponse } from 'next/server'
import { prisma }       from '@/lib/prisma'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function GET() {
  const pools = await prisma.prizePool.findMany({
    where:   { isFinished: true },
    orderBy: { endDate: 'desc' },
    include: {
      placements: { include: { prize: true }, orderBy: { place: 'asc' } },
      awards: {
        orderBy: { place: 'asc' },
        include: {
          winner: {
            select: { id: true, telegramId: true, firstName: true, username: true, photoUrl: true },
          },
        },
      },
    },
  })

  return NextResponse.json(
    pools.map(pool => ({
      id:          pool.id,
      name:        pool.name,
      ratingType:  pool.ratingType,
      startDate:   pool.startDate,
      endDate:     pool.endDate,
      results: pool.awards.map(award => {
        const placement = pool.placements.find(p => p.place === award.place)
        return {
          place:      award.place,
          status:     award.status,
          photoUrl:   award.photoUrl,
          prize:      placement?.prize ?? null,
          winner: award.winner
            ? {
                telegramId: award.winner.telegramId.toString(),
                firstName:  award.winner.firstName,
                username:   award.winner.username,
                photoUrl:   award.winner.photoUrl,
              }
            : null,
        }
      }),
    }))
  )
}