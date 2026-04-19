// app/api/chat/channels/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// DELETE /api/chat/channels/[id] — удалить канал (owner или глобальный admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const channelId = Number(id)
  if (isNaN(channelId)) return NextResponse.json({ error: 'Invalid channel id' }, { status: 400 })

  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { id: true, isDefault: true, isPrivate: true },
  })

  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  // Нельзя удалить дефолтный канал
  if (channel.isDefault) {
    return NextResponse.json({ error: 'Cannot delete the default channel' }, { status: 400 })
  }

  // Проверяем права: owner приватного канала или глобальный admin
  if (channel.isPrivate) {
    const membership = await prisma.chatMember.findUnique({
      where: { channelId_userId: { channelId, userId: user.id } },
    })
    if (membership?.role !== 'owner' && !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else {
    // Публичный канал — только глобальный admin
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Каскадное удаление настроено в Prisma схеме
  await prisma.chatChannel.delete({ where: { id: channelId } })

  return NextResponse.json({ success: true })
}

// PATCH /api/chat/channels/[id] — редактировать канал (owner или admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const channelId = Number(id)
  if (isNaN(channelId)) return NextResponse.json({ error: 'Invalid channel id' }, { status: 400 })

  const membership = await prisma.chatMember.findUnique({
    where: { channelId_userId: { channelId, userId: user.id } },
  })
  if (membership?.role !== 'owner' && !user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const updated = await prisma.chatChannel.update({
    where: { id: channelId },
    data: { name: name.trim(), description: description?.trim() || null },
  })

  return NextResponse.json(updated)
}