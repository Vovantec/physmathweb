// app/api/notifications/settings/route.ts
// Путь: app/api/notifications/settings/route.ts

import { NextResponse }                         from 'next/server'
import { prisma }                               from '@/lib/prisma'
import { getOrCreateNotificationSettings }      from '@/lib/telegram-notify'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

// GET /api/notifications/settings?userId=<telegramId>
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tgId = searchParams.get('userId')
  if (!tgId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(tgId) },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const settings = await getOrCreateNotificationSettings(user.id)
  return NextResponse.json(settings)
}

// PATCH /api/notifications/settings
// body: { userId: telegramId, deadlineReminder?: bool, newLesson?: bool, ... }
export async function PATCH(request: Request) {
  const body = await request.json()
  const { userId, ...updates } = body

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(userId) },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const allowed = ['deadlineReminder', 'newLesson', 'newNews', 'ratingChange', 'prizeAwarded']
  const safeUpdates: Record<string, boolean> = {}
  for (const key of allowed) {
    if (key in updates && typeof updates[key] === 'boolean') {
      safeUpdates[key] = updates[key]
    }
  }

  const settings = await prisma.notificationSettings.upsert({
    where:  { userId: user.id },
    update: safeUpdates,
    create: { userId: user.id, ...safeUpdates },
  })

  return NextResponse.json(settings)
}