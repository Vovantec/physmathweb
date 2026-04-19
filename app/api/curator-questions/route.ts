// app/api/curator-questions/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { NextRequest } from 'next/server'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

// GET — студент видит свои вопросы, куратор — все open/answered
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') // 'mine' | 'queue'

  if (mode === 'queue' && (user.isAdmin || (user as any).isCurator)) {
    const questions = await prisma.curatorQuestion.findMany({
      where: { status: { in: ['open', 'answered'] } },
      include: {
        student: { select: { id: true, firstName: true, username: true, photoUrl: true } },
        curator: { select: { id: true, firstName: true, username: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(questions)
  }

  // Student: their own questions
  const questions = await prisma.curatorQuestion.findMany({
    where: { studentId: user.id },
    include: {
      curator: { select: { id: true, firstName: true, username: true, photoUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(questions)
}

// POST — студент задаёт вопрос
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check premium
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isPremium: true, questionsLimit: true },
  })
  if (!fullUser?.isPremium) {
    return NextResponse.json({ error: 'Доступно только Premium студентам' }, { status: 403 })
  }

  // Check monthly limit
  if (fullUser.questionsLimit > 0) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const count = await prisma.curatorQuestion.count({
      where: { studentId: user.id, createdAt: { gte: startOfMonth } },
    })
    if (count >= fullUser.questionsLimit) {
      return NextResponse.json({
        error: `Лимит вопросов на этот месяц исчерпан (${fullUser.questionsLimit} шт.)`,
        limitReached: true,
      }, { status: 403 })
    }
  }

  const { subject, text, imageUrl } = await request.json()
  if (!subject || !text?.trim()) {
    return NextResponse.json({ error: 'subject and text required' }, { status: 400 })
  }

  const question = await prisma.curatorQuestion.create({
    data: { studentId: user.id, subject, text: text.trim(), imageUrl: imageUrl || null },
  })
  return NextResponse.json(question)
}