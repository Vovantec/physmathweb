// app/api/admin/exams/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const variant = await prisma.examVariant.findUnique({
    where: { id: parseInt(id) },
    include: {
      tasks: { orderBy: { order: 'asc' } },
    },
  })
  if (!variant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(variant)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { title, subject, year, pdfUrl, isPublished } = await request.json()

  const variant = await prisma.examVariant.update({
    where: { id: parseInt(id) },
    data: {
      ...(title !== undefined && { title }),
      ...(subject !== undefined && { subject }),
      ...(year !== undefined && { year: year ? parseInt(year) : null }),
      ...(pdfUrl !== undefined && { pdfUrl: pdfUrl || null }),
      ...(isPublished !== undefined && { isPublished }),
    },
  })
  return NextResponse.json(variant)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.examVariant.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}