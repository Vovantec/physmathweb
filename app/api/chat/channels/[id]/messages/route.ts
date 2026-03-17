// app/api/chat/channels/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/chat/channels/[id]/messages?before=<msgId>&limit=50
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const channelId = Number(params.id)
  const url = new URL(req.url)
  const before = url.searchParams.get('before') ? Number(url.searchParams.get('before')) : undefined
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100)

  const messages = await prisma.chatMessage.findMany({
    where: {
      channelId,
      deletedAt: null,
      ...(before ? { id: { lt: before } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, firstName: true, photoUrl: true, username: true } }
    }
  })

  // Return in chronological order
  return NextResponse.json(messages.reverse())
}