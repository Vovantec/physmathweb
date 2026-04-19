// app/api/admin/exams/[id]/tasks/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const variantId = parseInt(id)
  const { number, part, text, imageUrl, pdfUrl, answer, maxScore, topic } = await request.json()

  const maxOrder = await prisma.examTask.aggregate({
    where: { variantId },
    _max: { order: true },
  })

  const task = await prisma.examTask.create({
    data: {
      variantId,
      number: parseInt(number),
      part: parseInt(part) || 1,
      text,
      imageUrl: imageUrl || null,
      pdfUrl: pdfUrl || null,
      answer: answer || null,
      maxScore: parseInt(maxScore) || 1,
      topic: topic || null,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  })
  return NextResponse.json(task)
}