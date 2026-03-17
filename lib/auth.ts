// lib/auth.ts
// Хелпер для получения авторизованного пользователя из входящего запроса.
// Используется в API-роутах чата и других защищённых эндпоинтах.

import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

const SECRET = process.env.BOT_TOKEN || 'secret'

export interface RequestUser {
  id:         number      // DB id (User.id)
  telegramId: bigint
  firstName:  string | null
  username:   string | null
  photoUrl:   string | null
  isAdmin:    boolean
}

/**
 * Читает куку session_token, верифицирует JWT и возвращает юзера из БД.
 * Возвращает null если токен отсутствует, невалиден или юзер не найден.
 *
 * Использование в route handler:
 *   const user = await getUserFromRequest(req)
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 */
export async function getUserFromRequest(
  _req?: NextRequest   // параметр оставлен для совместимости сигнатуры, кука читается через next/headers
): Promise<RequestUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session_token')?.value
    if (!token) return null

    let decoded: any
    try {
      decoded = jwt.verify(token, SECRET)
    } catch {
      return null
    }

    const telegramId = decoded.userId ?? decoded.telegramId
    if (!telegramId) return null

    const user = await prisma.user.findUnique({
      where:  { telegramId: BigInt(telegramId) },
      select: {
        id:         true,
        telegramId: true,
        firstName:  true,
        username:   true,
        photoUrl:   true,
        isAdmin:    true,
      },
    })

    return user ?? null
  } catch {
    return null
  }
}