// app/api/admin/exams/tasks/[taskId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { taskId } = await params
  const body = await request.json()

  const task = await prisma.examTask.update({
    where: { id: parseInt(taskId) },
    data: {
      ...(body.number !== undefined && { number: parseInt(body.number) }),
      ...(body.part !== undefined && { part: parseInt(body.part) }),
      ...(body.text !== undefined && { text: body.text }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
      ...(body.pdfUrl !== undefined && { pdfUrl: body.pdfUrl || null }),
      ...(body.answer !== undefined && { answer: body.answer || null }),
      ...(body.maxScore !== undefined && { maxScore: parseInt(body.maxScore) }),
      ...(body.topic !== undefined && { topic: body.topic || null }),
    },
  })
  return NextResponse.json(task)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { taskId } = await params
  await prisma.examTask.delete({ where: { id: parseInt(taskId) } })
  return NextResponse.json({ success: true })
}