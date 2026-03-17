// app/api/auth/me/route.ts
// Путь: app/api/auth/me/route.ts
//
// Вызывается при каждой загрузке страницы.
// Проверяет куку session_token — если невалидна, возвращает 401.

import { NextResponse } from 'next/server'
import { prisma }       from '@/lib/prisma'
import { cookies }      from 'next/headers'
import jwt              from 'jsonwebtoken'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

const SECRET = process.env.BOT_TOKEN || 'secret'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session_token')?.value

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    // Verify JWT signature + expiry
    let decoded: any
    try {
      decoded = jwt.verify(token, SECRET)
    } catch {
      // Token expired or tampered
      const response = NextResponse.json({ authenticated: false }, { status: 401 })
      // Clear the stale cookie
      response.cookies.set('session_token', '', {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path:     '/',
        maxAge:   0,
      })
      return response
    }

    // Verify user still exists in DB
    const user = await prisma.user.findUnique({
      where:  { telegramId: BigInt(decoded.userId) },
      select: {
        id:        true,
        telegramId: true,
        firstName:  true,
        username:   true,
        photoUrl:   true,
        isAdmin:    true,
      },
    })

    if (!user) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 })
      response.cookies.set('session_token', '', { maxAge: 0, path: '/' })
      return response
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id:      user.telegramId.toString(),
        dbId:    user.id.toString(),
        name:    user.firstName ?? user.username ?? null,
        photo:   user.photoUrl,
        isAdmin: user.isAdmin,
      },
    })
  } catch (e) {
    console.error('[/api/auth/me]', e)
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}