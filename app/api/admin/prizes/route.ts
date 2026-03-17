// app/api/admin/prizes/route.ts
// Путь: app/api/admin/prizes/route.ts

import { NextResponse }     from 'next/server'
import { prisma }           from '@/lib/prisma'
import { checkAdminAuth }   from '@/lib/admin-auth'

// GET — список всех призов
export async function GET() {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const prizes = await prisma.prize.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(prizes)
}

// POST — создать приз
export async function POST(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, imageUrl } = await request.json()
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const prize = await prisma.prize.create({
    data: { title, description: description ?? null, imageUrl: imageUrl ?? null },
  })
  return NextResponse.json(prize)
}

// DELETE ?id=
export async function DELETE(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.prize.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}

// PATCH — обновить приз
export async function PATCH(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, title, description, imageUrl } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const prize = await prisma.prize.update({
    where: { id: parseInt(id) },
    data:  { title, description, imageUrl },
  })
  return NextResponse.json(prize)
}