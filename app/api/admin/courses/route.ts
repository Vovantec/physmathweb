// app/api/admin/courses/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

export async function POST(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const { title, description, courseType, maxStudents } = body

    // Try with new fields first, fallback to base fields if migration not done
    let course
    try {
      course = await prisma.course.create({
        data: {
          title,
          description,
          courseType: courseType || 'self',
          maxStudents: courseType === 'group' && maxStudents ? parseInt(maxStudents) : null,
        },
      })
    } catch (e: any) {
      if (e?.message?.includes('courseType') || e?.message?.includes('maxStudents')) {
        // Migration not applied yet — create without new fields
        course = await prisma.course.create({ data: { title, description } })
      } else {
        throw e
      }
    }

    return NextResponse.json({ courseType: 'self', maxStudents: null, ...course })
  } catch (e) {
    console.error('[POST /api/admin/courses]', e)
    return NextResponse.json({ error: 'Error creating course' }, { status: 500 })
  }
}

export async function GET() {
  const auth = await checkAdminAuth()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const courses = await prisma.course.findMany({ include: { tasks: true } })
  return NextResponse.json(courses.map(c => ({
    courseType: 'self',
    maxStudents: null,
    ...c,
  })))
}