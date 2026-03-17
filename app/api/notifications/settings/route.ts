// app/api/notifications/settings/route.ts
import { NextRequest, NextResponse }           from 'next/server'
import { prisma }                              from '@/lib/prisma'
import { getUserFromRequest }                  from '@/lib/auth'
import { getOrCreateNotificationSettings }     from '@/lib/telegram-notify'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

// GET /api/notifications/settings
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await getOrCreateNotificationSettings(user.id)
  return NextResponse.json(settings)
}

// PATCH /api/notifications/settings
// body: { deadlineReminder?: bool, newLesson?: bool, newNews?: bool,
//         ratingChange?: bool, prizeAwarded?: bool, chatMuted?: bool }
export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const allowed = ['deadlineReminder', 'newLesson', 'newNews', 'ratingChange', 'prizeAwarded', 'chatMuted']
  const safeUpdates: Record<string, boolean> = {}
  for (const key of allowed) {
    if (key in body && typeof body[key] === 'boolean') {
      safeUpdates[key] = body[key]
    }
  }

  const settings = await prisma.notificationSettings.upsert({
    where:  { userId: user.id },
    update: safeUpdates,
    create: { userId: user.id, ...safeUpdates },
  })

  return NextResponse.json(settings)
}