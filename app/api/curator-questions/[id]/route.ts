// app/api/curator-questions/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { NextRequest } from 'next/server'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.isAdmin && !(user as any).isCurator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { answer, answerImageUrl, action } = await request.json()
  // action: 'answer' | 'close'

  const question = await prisma.curatorQuestion.findUnique({ where: { id: parseInt(id) } })
  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'answer') {
    if (!answer?.trim()) return NextResponse.json({ error: 'answer required' }, { status: 400 })
    const updated = await prisma.curatorQuestion.update({
      where: { id: parseInt(id) },
      data: {
        answer: answer.trim(),
        answerImageUrl: answerImageUrl || null,
        status: 'answered',
        curatorId: user.id,
        answeredAt: new Date(),
      },
    })
    return NextResponse.json(updated)
  }

  if (action === 'close') {
    const updated = await prisma.curatorQuestion.update({
      where: { id: parseInt(id) },
      data: { status: 'closed' },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}