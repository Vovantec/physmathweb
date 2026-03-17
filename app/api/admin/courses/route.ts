// app/api/admin/courses/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

export async function POST(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { title, description, courseType, maxStudents } = await request.json()

    const course = await prisma.course.create({
      data: {
        title,
        description,
        courseType: courseType || 'self',
        maxStudents: courseType === 'group' && maxStudents ? parseInt(maxStudents) : null,
      },
    })

    return NextResponse.json(course)
  } catch (e) {
    return NextResponse.json({ error: 'Error creating course' }, { status: 500 })
  }
}

export async function GET() {
  const auth = await checkAdminAuth()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const courses = await prisma.course.findMany({ include: { tasks: true } })
  return NextResponse.json(courses)
}