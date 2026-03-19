// app/api/chat/channels/[id]/members/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

async function canManage(requestingUser: { id: number; isAdmin: boolean }, channelId: number): Promise<boolean> {
  if (requestingUser.isAdmin) return true
  const member = await prisma.chatMember.findUnique({
    where: { channelId_userId: { channelId, userId: requestingUser.id } },
  })
  return member?.role === 'owner'
}

// GET — список участников
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const channelId = Number(id)

  // Проверяем что канал приватный и пользователь является членом
  const membership = await prisma.chatMember.findUnique({
    where: { channelId_userId: { channelId, userId: user.id } },
  })
  if (!membership && !user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const members = await prisma.chatMember.findMany({
    where: { channelId },
    include: {
      user: { select: { id: true, firstName: true, username: true, photoUrl: true, telegramId: true } },
    },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  })

  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { id: true, name: true, isPrivate: true },
  })

  return NextResponse.json({
    channel,
    members: members.map(m => ({
      id:       m.id,
      role:     m.role,
      joinedAt: m.joinedAt,
      user:     m.user,
    })),
    myRole: membership?.role ?? (user.isAdmin ? 'admin' : null),
  })
}

// POST — добавить участника вручную (owner или глобальный админ)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const channelId = Number(id)

  if (!await canManage(user, channelId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // Проверяем что пользователь существует
  const targetUser = await prisma.user.findUnique({ where: { id: Number(userId) } })
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const member = await prisma.chatMember.upsert({
    where: { channelId_userId: { channelId, userId: Number(userId) } },
    update: {},
    create: { channelId, userId: Number(userId), role: 'member' },
    include: {
      user: { select: { id: true, firstName: true, username: true, photoUrl: true } },
    },
  })

  return NextResponse.json(member, { status: 201 })
}

// DELETE — выгнать или покинуть
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const channelId = Number(id)

  const url = new URL(req.url)
  const targetUserId = Number(url.searchParams.get('userId') ?? user.id)

  const isSelf = targetUserId === user.id

  // Покинуть — может любой участник (кроме owner — он должен сначала передать права)
  if (isSelf) {
    const membership = await prisma.chatMember.findUnique({
      where: { channelId_userId: { channelId, userId: user.id } },
    })
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 404 })
    if (membership.role === 'owner') {
      return NextResponse.json({ error: 'Owner cannot leave. Transfer ownership first.' }, { status: 400 })
    }
    await prisma.chatMember.delete({ where: { channelId_userId: { channelId, userId: user.id } } })
    return NextResponse.json({ success: true, action: 'left' })
  }

  // Выгнать — только owner или глобальный админ
  if (!await canManage(user, channelId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Нельзя выгнать другого owner
  const targetMembership = await prisma.chatMember.findUnique({
    where: { channelId_userId: { channelId, userId: targetUserId } },
  })
  if (!targetMembership) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (targetMembership.role === 'owner' && !user.isAdmin) {
    return NextResponse.json({ error: 'Cannot kick owner' }, { status: 403 })
  }

  await prisma.chatMember.delete({ where: { channelId_userId: { channelId, userId: targetUserId } } })
  return NextResponse.json({ success: true, action: 'kicked' })
}