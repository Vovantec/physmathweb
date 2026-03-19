// app/api/chat/channels/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

async function checkAccess(user: { id: number } | null, channelId: number): Promise<boolean> {
  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { isPrivate: true },
  })
  if (!channel) return false
  if (!channel.isPrivate) return true
  if (!user) return false
  const member = await prisma.chatMember.findUnique({
    where: { channelId_userId: { channelId, userId: user.id } },
  })
  return !!member
}

// GET /api/chat/channels/[id]/messages?before=<msgId>&limit=50
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const channelId = Number(id)
  if (isNaN(channelId)) return NextResponse.json({ error: 'Invalid channel id' }, { status: 400 })

  if (!await checkAccess(user, channelId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const beforeParam = url.searchParams.get('before')
  const before = beforeParam ? Number(beforeParam) : undefined
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100)

  const messages = await prisma.chatMessage.findMany({
    where: {
      channelId,
      deletedAt: null,
      ...(before && !isNaN(before) ? { id: { lt: before } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, firstName: true, photoUrl: true, username: true } },
    },
  })

  return NextResponse.json(messages.reverse())
}