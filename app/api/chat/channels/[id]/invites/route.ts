// app/api/chat/channels/[id]/invites/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// GET — список активных инвайтов канала
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const channelId = Number(id)

  const membership = await prisma.chatMember.findUnique({
    where: { channelId_userId: { channelId, userId: user.id } },
  })
  if (!membership && !user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const invites = await prisma.chatInvite.findMany({
    where: {
      channelId,
      expiresAt: { gt: new Date() },
      // Не показываем исчерпанные
    },
    orderBy: { createdAt: 'desc' },
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://physmathlab.ru'
  return NextResponse.json(invites.map(inv => ({
    ...inv,
    url:       `${baseUrl}/chat/invite/${inv.id}`,
    isExpired: inv.usedCount >= inv.usageLimit,
  })))
}

// POST — создать ссылку-приглашение
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const channelId = Number(id)

  // Только owner или глобальный админ могут создавать инвайты
  const membership = await prisma.chatMember.findUnique({
    where: { channelId_userId: { channelId, userId: user.id } },
  })
  if (membership?.role !== 'owner' && !user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { usageLimit, expiresInDays } = await req.json()

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (expiresInDays ?? 7))

  const invite = await prisma.chatInvite.create({
    data: {
      channelId,
      createdBy:  user.id,
      usageLimit: usageLimit ?? 10,
      expiresAt,
    },
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://physmathlab.ru'
  return NextResponse.json({
    ...invite,
    url: `${baseUrl}/chat/invite/${invite.id}`,
  }, { status: 201 })
}

// DELETE — отозвать инвайт
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const channelId = Number(id)
  const url = new URL(req.url)
  const inviteId = url.searchParams.get('inviteId')
  if (!inviteId) return NextResponse.json({ error: 'inviteId required' }, { status: 400 })

  const membership = await prisma.chatMember.findUnique({
    where: { channelId_userId: { channelId, userId: user.id } },
  })
  if (membership?.role !== 'owner' && !user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.chatInvite.delete({ where: { id: inviteId } })
  return NextResponse.json({ success: true })
}