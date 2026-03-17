// app/api/admin/courses/[id]/edit/route.ts
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
  const { title, description, courseType, maxStudents } = await request.json()

  const course = await prisma.course.update({
    where: { id: parseInt(id) },
    data: {
      title,
      description,
      courseType,
      maxStudents: maxStudents ? parseInt(maxStudents) : null,
    },
  })

  return NextResponse.json(course)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  await prisma.course.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}