// app/api/admin/prizes/award/route.ts
// Путь: app/api/admin/prizes/award/route.ts

import { NextResponse }   from 'next/server'
import { prisma }         from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'
import { sendTelegramNotification } from '@/lib/telegram-notify'

// PATCH — отметить приз как выданный
export async function PATCH(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { awardId, photoUrl, comment } = await request.json()
  if (!awardId) return NextResponse.json({ error: 'awardId required' }, { status: 400 })

  const award = await prisma.prizeAward.update({
    where: { id: awardId },
    data:  {
      status:    'awarded',
      awardedAt: new Date(),
      photoUrl:  photoUrl ?? null,
      comment:   comment ?? null,
    },
    include: {
      winner: { select: { id: true, firstName: true } },
      pool:   { select: { name: true } },
    },
  })

  // Уведомляем победителя о выдаче
  await sendTelegramNotification({
    userId: award.winner.id,
    type:   'prizeAwarded',
    text:   `✅ <b>Приз выдан!</b>\n\nВаш приз по розыгрышу «${award.pool.name}» вручён. Поздравляем! 🎉`,
    refId:  `awarded-${awardId}`,
  })

  return NextResponse.json(award)
}