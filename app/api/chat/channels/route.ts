// app/api/chat/channels/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/chat/channels — список каналов (приватные только для членов)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)

  const allChannels = await prisma.chatChannel.findMany({
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'asc' }],
    include: {
      _count: { select: { messages: { where: { deletedAt: null } } } },
      members: user ? { where: { userId: user.id }, select: { role: true } } : false,
    },
  })

  // Фильтруем приватные — показываем только если пользователь является членом
  const visibleChannels = allChannels.filter(ch => {
    if (!ch.isPrivate) return true
    if (!user) return false
    return (ch.members as any[]).length > 0
  })

  // Unread counts
  const unreadMap: Record<number, number> = {}
  if (user) {
    const pointers = await prisma.chatReadPointer.findMany({ where: { userId: user.id } })
    const ptrMap = Object.fromEntries(pointers.map(p => [p.channelId, p.lastReadMsgId]))

    for (const ch of visibleChannels) {
      const lastRead = ptrMap[ch.id] ?? 0
      unreadMap[ch.id] = await prisma.chatMessage.count({
        where: { channelId: ch.id, id: { gt: lastRead }, deletedAt: null },
      })
    }
  }

  return NextResponse.json(visibleChannels.map(ch => ({
    id:            ch.id,
    name:          ch.name,
    description:   ch.description,
    isPinned:      ch.isPinned,
    isDefault:     ch.isDefault,
    isPrivate:     ch.isPrivate,
    totalMessages: ch._count.messages,
    unread:        unreadMap[ch.id] ?? null,
    myRole:        user ? ((ch.members as any[])[0]?.role ?? null) : null,
  })))
}

// POST /api/chat/channels — создать канал (любой авторизованный пользователь)
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description, isPrivate } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  // Публичные каналы могут создавать только глобальные администраторы
  if (!isPrivate) {
    const admins = (process.env.ADMINS || '').split(',').map(s => s.trim())
    if (!admins.includes(String(user.telegramId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const channel = await prisma.chatChannel.create({
    data: {
      name:        name.trim(),
      description: description?.trim() || null,
      isPrivate:   isPrivate ?? false,
    },
  })

  // Для приватного канала создатель становится owner
  if (isPrivate) {
    await prisma.chatMember.create({
      data: { channelId: channel.id, userId: user.id, role: 'owner' },
    })
  }

  return NextResponse.json({ ...channel, myRole: isPrivate ? 'owner' : null }, { status: 201 })
}