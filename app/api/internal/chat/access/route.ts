// app/api/internal/chat/access/route.ts
// Используется WS-сервером для проверки доступа к приватному каналу

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkInternalAuth } from '@/lib/internal-api'

export async function GET(request: Request) {
  if (!checkInternalAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId    = searchParams.get('userId')
  const channelId = searchParams.get('channelId')

  if (!userId || !channelId) {
    return NextResponse.json({ error: 'userId and channelId required' }, { status: 400 })
  }

  const channel = await prisma.chatChannel.findUnique({
    where: { id: parseInt(channelId) },
    select: { isPrivate: true },
  })

  if (!channel) return NextResponse.json({ allowed: false })
  if (!channel.isPrivate) return NextResponse.json({ allowed: true })

  const member = await prisma.chatMember.findUnique({
    where: {
      channelId_userId: {
        channelId: parseInt(channelId),
        userId:    parseInt(userId),
      },
    },
  })

  return NextResponse.json({ allowed: !!member })
}