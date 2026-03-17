// app/api/admin/questions/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { type, content, answer, videoUrl, imageUrl } = await request.json()

  const question = await prisma.question.update({
    where: { id: parseInt(id) },
    data: {
      type,
      content,
      answer,
      videoUrl: videoUrl || null,
      imageUrl: imageUrl || null,
    },
  })
  return NextResponse.json(question)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.question.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}