// app/api/admin/exam-tickets/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getUserFromRequest } from '@/lib/auth'
import { NextRequest } from 'next/server'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

// GET — список тикетов (для куратора/админа)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.isAdmin && !(user as any).isCurator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // 'submitted' | 'reviewing' | 'revision' | 'closed'
  const subject = searchParams.get('subject')

  const attempts = await prisma.examAttempt.findMany({
    where: {
      status: status ? status : { in: ['submitted', 'reviewing', 'revision'] },
      ...(subject && { variant: { subject } }),
    },
    include: {
      student: { select: { id: true, firstName: true, username: true, photoUrl: true } },
      variant: { select: { id: true, title: true, subject: true } },
    },
    orderBy: { submittedAt: 'asc' },
  })

  return NextResponse.json(attempts)
}