// app/api/admin/reorder/route.ts
// PATCH { type: 'task'|'lesson'|'question', id: number, direction: 'up'|'down', parentId: number }
// parentId — courseId для task, taskId для lesson, lessonId для question

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

export async function PATCH(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { type, id, direction, parentId } = await request.json()

  if (!type || !id || !direction || !parentId) {
    return NextResponse.json({ error: 'type, id, direction, parentId required' }, { status: 400 })
  }

  try {
    // Fetch all siblings sorted by order
    let siblings: { id: number; order: number }[] = []

    if (type === 'task') {
      siblings = await prisma.task.findMany({
        where: { courseId: parentId },
        select: { id: true, order: true },
        orderBy: { order: 'asc' },
      })
    } else if (type === 'lesson') {
      siblings = await prisma.lesson.findMany({
        where: { taskId: parentId },
        select: { id: true, order: true },
        orderBy: { order: 'asc' },
      })
    } else if (type === 'question') {
      siblings = await prisma.question.findMany({
        where: { lessonId: parentId },
        select: { id: true, order: true },
        orderBy: { order: 'asc' },
      })
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const idx = siblings.findIndex(s => s.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= siblings.length) {
      return NextResponse.json({ error: 'Already at boundary' }, { status: 400 })
    }

    const current = siblings[idx]
    const swap = siblings[swapIdx]

    // Swap order values
    if (type === 'task') {
      await prisma.$transaction([
        prisma.task.update({ where: { id: current.id }, data: { order: swap.order } }),
        prisma.task.update({ where: { id: swap.id }, data: { order: current.order } }),
      ])
    } else if (type === 'lesson') {
      await prisma.$transaction([
        prisma.lesson.update({ where: { id: current.id }, data: { order: swap.order } }),
        prisma.lesson.update({ where: { id: swap.id }, data: { order: current.order } }),
      ])
    } else if (type === 'question') {
      await prisma.$transaction([
        prisma.question.update({ where: { id: current.id }, data: { order: swap.order } }),
        prisma.question.update({ where: { id: swap.id }, data: { order: current.order } }),
      ])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[reorder]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}