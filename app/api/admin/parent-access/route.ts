// app/api/admin/parent-access/route.ts
// POST → generate parent access token for a student
// GET  → list all parent access tokens

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/admin-auth'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

export async function POST(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { studentId, label, expiresInDays } = await request.json()

  if (!studentId) {
    return NextResponse.json({ error: 'studentId required' }, { status: 400 })
  }

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null

  const access = await prisma.parentAccess.create({
    data: {
      studentId: parseInt(studentId),
      label: label || null,
      expiresAt,
    },
    include: {
      student: { select: { firstName: true, username: true } },
    },
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://physmathlab.ru'

  return NextResponse.json({
    id: access.id,
    token: access.token,
    label: access.label,
    expiresAt: access.expiresAt,
    studentName: access.student.firstName ?? access.student.username,
    url: `${baseUrl}/parent/${access.token}`,
  })
}

export async function GET() {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const accesses = await prisma.parentAccess.findMany({
    include: {
      student: { select: { id: true, firstName: true, username: true, photoUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://physmathlab.ru'

  return NextResponse.json(
    accesses.map(a => ({
      id: a.id,
      token: a.token,
      label: a.label,
      expiresAt: a.expiresAt,
      createdAt: a.createdAt,
      student: a.student,
      url: `${baseUrl}/parent/${a.token}`,
      isExpired: a.expiresAt ? new Date() > a.expiresAt : false,
    }))
  )
}

export async function DELETE(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.parentAccess.delete({ where: { id } })
  return NextResponse.json({ success: true })
}