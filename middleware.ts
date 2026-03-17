// middleware.ts
// Путь: middleware.ts (корень проекта, рядом с package.json)
//
// Защищает /admin/* на уровне Edge — до рендера любой страницы.
// Проверяет JWT из куки session_token и наличие userId в списке ADMINS.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_IDS = (process.env.ADMINS ?? '').split(',').map(s => s.trim()).filter(Boolean)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('session_token')?.value

  if (!token) {
    return redirectToHome(request)
  }

  try {
    const secret  = new TextEncoder().encode(process.env.BOT_TOKEN ?? 'secret')
    const { payload } = await jwtVerify(token, secret)
    const userId  = String(payload.userId ?? '')

    if (!ADMIN_IDS.includes(userId)) {
      return redirectToHome(request)
    }

    return NextResponse.next()
  } catch {
    // Token expired or invalid
    return redirectToHome(request)
  }
}

function redirectToHome(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = '/'
  url.searchParams.set('auth_required', '1')
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/admin/:path*'],
}