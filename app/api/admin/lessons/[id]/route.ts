// app/api/admin/lessons/[id]/route.ts
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
  const { title, videoUrl, imageUrl, pdfId } = await request.json()

  const lesson = await prisma.lesson.update({
    where: { id: parseInt(id) },
    data: { title, videoUrl: videoUrl || null, imageUrl: imageUrl || null, pdfId: pdfId || null },
  })
  return NextResponse.json(lesson)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.lesson.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}