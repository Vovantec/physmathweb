// app/api/admin/tasks/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

export async function POST(request: Request) {
  if (!await checkAdminAuth()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { title, courseId } = await request.json()

    // Get max order for this course's tasks
    const maxOrder = await prisma.task.aggregate({
      where: { courseId: Number(courseId) },
      _max: { order: true },
    })
    const nextOrder = (maxOrder._max.order ?? 0) + 1

    const task = await prisma.task.create({
      data: {
        title,
        courseId: Number(courseId),
        order: nextOrder,
      },
    })

    return NextResponse.json(task)
  } catch (e) {
    return NextResponse.json({ error: 'Error creating task' }, { status: 500 })
  }
}