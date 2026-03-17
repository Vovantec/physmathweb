// app/api/chat/channels/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/chat/channels — список каналов + кол-во непрочитанных для текущего юзера
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)

  const channels = await prisma.chatChannel.findMany({
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'asc' }],
    include: {
      _count: { select: { messages: { where: { deletedAt: null } } } }
    }
  })

  // Unread counts per channel for this user
  const unreadMap: Record<number, number> = {}
  if (user) {
    const pointers = await prisma.chatReadPointer.findMany({
      where: { userId: user.id }
    })
    const ptrMap = Object.fromEntries(pointers.map(p => [p.channelId, p.lastReadMsgId]))

    for (const ch of channels) {
      const lastRead = ptrMap[ch.id] ?? 0
      unreadMap[ch.id] = await prisma.chatMessage.count({
        where: {
          channelId: ch.id,
          id:        { gt: lastRead },
          deletedAt: null,
        }
      })
    }
  }

  return NextResponse.json(channels.map(ch => ({
    id:          ch.id,
    name:        ch.name,
    description: ch.description,
    isPinned:    ch.isPinned,
    isDefault:   ch.isDefault,
    totalMessages: ch._count.messages,
    unread:      unreadMap[ch.id] ?? null,
  })))
}

// POST /api/chat/channels — создать канал (только админ)
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admins = (process.env.ADMINS || '').split(',').map(s => s.trim())
  if (!admins.includes(String(user.telegramId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const channel = await prisma.chatChannel.create({
    data: { name: name.trim(), description: description?.trim() || null }
  })

  return NextResponse.json(channel, { status: 201 })
}