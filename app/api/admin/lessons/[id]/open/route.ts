// app/api/admin/lessons/[id]/open/route.ts
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
  const { open } = await request.json()

  const lesson = await prisma.lesson.update({
    where: { id: parseInt(id) },
    data: { homeworkOpen: open },
  })

  return NextResponse.json({ id: lesson.id, homeworkOpen: lesson.homeworkOpen })
}