// app/api/admin/exams/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

export async function GET() {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const variants = await prisma.examVariant.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { tasks: true, attempts: true } },
    },
  })
  return NextResponse.json(variants)
}

export async function POST(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, subject, year, pdfUrl } = await request.json()
  if (!title || !subject) return NextResponse.json({ error: 'title and subject required' }, { status: 400 })

  const variant = await prisma.examVariant.create({
    data: { title, subject, year: year ? parseInt(year) : null, pdfUrl: pdfUrl || null },
  })
  return NextResponse.json(variant)
}