// app/api/admin/prizes/pools/route.ts
// Путь: app/api/admin/prizes/pools/route.ts

import { NextResponse }   from 'next/server'
import { prisma }         from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

// GET — все розыгрыши
export async function GET() {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const pools = await prisma.prizePool.findMany({
    orderBy:  { createdAt: 'desc' },
    include: {
      placements: { include: { prize: true }, orderBy: { place: 'asc' } },
      awards:     {
        include: { winner: { select: { id: true, firstName: true, username: true, photoUrl: true } } },
        orderBy: { place: 'asc' },
      },
    },
  })
  return NextResponse.json(pools)
}

// POST — создать розыгрыш
export async function POST(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, ratingType, startDate, endDate, placesCount, placements } = await request.json()
  // placements: [{ place: 1, prizeId: 3 }, ...]

  const pool = await prisma.prizePool.create({
    data: {
      id:          crypto.randomUUID(),
      name,
      ratingType:  ratingType ?? 'points',
      startDate:   new Date(startDate),
      endDate:     new Date(endDate),
      placesCount: parseInt(placesCount),
      placements: {
        create: (placements ?? []).map((p: { place: number; prizeId: number }) => ({
          place:   p.place,
          prizeId: p.prizeId,
        })),
      },
    },
    include: { placements: { include: { prize: true } } },
  })

  return NextResponse.json(pool)
}

// PATCH — обновить розыгрыш (призовые места / даты)
export async function PATCH(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, name, ratingType, startDate, endDate, placesCount, placements } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Replace placements atomically
  await prisma.$transaction([
    prisma.prizePlacement.deleteMany({ where: { poolId: id } }),
    prisma.prizePool.update({
      where: { id },
      data:  {
        name,
        ratingType,
        startDate:   new Date(startDate),
        endDate:     new Date(endDate),
        placesCount: parseInt(placesCount),
        placements: {
          create: (placements ?? []).map((p: { place: number; prizeId: number }) => ({
            place:   p.place,
            prizeId: p.prizeId,
          })),
        },
      },
    }),
  ])

  return NextResponse.json({ success: true })
}

// DELETE ?id=
export async function DELETE(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.prizePool.delete({ where: { id } })
  return NextResponse.json({ success: true })
}