// app/api/chat/invite/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// GET — получить инфо об инвайте (превью перед вступлением)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const invite = await prisma.chatInvite.findUnique({
    where: { id },
    include: { channel: { select: { id: true, name: true, description: true } } },
  })

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
  if (invite.usedCount >= invite.usageLimit) return NextResponse.json({ error: 'Invite limit reached' }, { status: 410 })

  return NextResponse.json({
    channelId:   invite.channelId,
    channelName: invite.channel.name,
    description: invite.channel.description,
    usageLeft:   invite.usageLimit - invite.usedCount,
    expiresAt:   invite.expiresAt,
  })
}

// POST — вступить в канал по инвайту
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const invite = await prisma.chatInvite.findUnique({
    where: { id },
    include: { channel: { select: { id: true, name: true } } },
  })

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
  if (invite.usedCount >= invite.usageLimit) return NextResponse.json({ error: 'Invite limit reached' }, { status: 410 })

  // Уже член?
  const existing = await prisma.chatMember.findUnique({
    where: { channelId_userId: { channelId: invite.channelId, userId: user.id } },
  })

  if (existing) {
    return NextResponse.json({
      success:   true,
      alreadyMember: true,
      channelId: invite.channelId,
      channelName: invite.channel.name,
    })
  }

  // Добавляем участника и увеличиваем счётчик
  await prisma.$transaction([
    prisma.chatMember.create({
      data: { channelId: invite.channelId, userId: user.id, role: 'member' },
    }),
    prisma.chatInvite.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    }),
  ])

  return NextResponse.json({
    success:    true,
    channelId:  invite.channelId,
    channelName: invite.channel.name,
  })
}