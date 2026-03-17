// app/api/chat/unread/route.ts
// Используется SiteHeader для бейджа непрочитанных сообщений
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ total: 0, muted: false })

  const channels = await prisma.chatChannel.findMany({ select: { id: true } })
  const pointers = await prisma.chatReadPointer.findMany({ where: { userId: user.id } })
  const ptrMap = Object.fromEntries(pointers.map(p => [p.channelId, p.lastReadMsgId]))

  let total = 0
  for (const ch of channels) {
    const lastRead = ptrMap[ch.id] ?? 0
    const count = await prisma.chatMessage.count({
      where: { channelId: ch.id, id: { gt: lastRead }, deletedAt: null }
    })
    total += count
  }

  // Check mute setting
  const settings = await prisma.notificationSettings.findUnique({ where: { userId: user.id } })
  const muted = settings?.chatMuted ?? false

  return NextResponse.json({ total, muted })
}