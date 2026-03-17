// app/api/internal/notify/route.ts
// Путь: app/api/internal/notify/route.ts
//
// POST { type, refId, payload }
// Вызывается изнутри сайта при публикации новости / добавлении урока

import { NextResponse }             from 'next/server'
import { prisma }                   from '@/lib/prisma'
import { broadcastNotification }    from '@/lib/telegram-notify'
import { checkInternalAuth }        from '@/lib/internal-api'

export async function POST(request: Request) {
  if (!checkInternalAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type, refId, payload } = await request.json()

  // Get all user ids
  const users = await prisma.user.findMany({ select: { id: true } })
  const userIds = users.map(u => u.id)

  if (type === 'newLesson') {
    const { lessonId, lessonTitle, courseTitle } = payload
    await broadcastNotification(
      userIds,
      'newLesson',
      () => `📝 <b>Новый урок</b>\n\n«${lessonTitle}» в курсе «${courseTitle}»\n\n<a href="https://physmathlab.ru/lesson/${lessonId}">Открыть урок →</a>`,
      `lesson-${lessonId}`
    )
    return NextResponse.json({ ok: true, sent: userIds.length })
  }

  if (type === 'newNews') {
    const { newsId, newsTitle } = payload
    await broadcastNotification(
      userIds,
      'newNews',
      () => `📢 <b>Новая новость</b>\n\n«${newsTitle}»\n\n<a href="https://physmathlab.ru/news">Читать →</a>`,
      `news-${newsId}`
    )
    return NextResponse.json({ ok: true, sent: userIds.length })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}