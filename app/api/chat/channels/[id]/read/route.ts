// app/api/chat/channels/[id]/read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// POST /api/chat/channels/[id]/read  { lastReadMsgId: number }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const channelId = Number(params.id)
  const { lastReadMsgId } = await req.json()

  await prisma.chatReadPointer.upsert({
    where:  { userId_channelId: { userId: user.id, channelId } },
    update: { lastReadMsgId, updatedAt: new Date() },
    create: { userId: user.id, channelId, lastReadMsgId },
  })

  return NextResponse.json({ ok: true })
}